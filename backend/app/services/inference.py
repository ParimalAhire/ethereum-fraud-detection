import time
import requests
import numpy as np
import networkx as nx
import torch
from app.core.config import settings
from app.core.model_loader import get_models
import logging

logger = logging.getLogger(__name__)


# ── Etherscan API ─────────────────────────────────────────────────────────────

def _etherscan(params, retries=3):
    params["chainid"] = settings.CHAIN_ID
    params["apikey"]  = settings.ETHERSCAN_API_KEY
    for _ in range(retries):
        try:
            r = requests.get(settings.ETHERSCAN_BASE, params=params, timeout=15)
            data = r.json()
            if "Max rate limit" in str(data.get("result", "")):
                time.sleep(0.3)
                continue
            return data
        except Exception:
            time.sleep(0.5)
    return {}


def _fetch_txs(address):
    data = _etherscan({
        "module": "account", "action": "txlist",
        "address": address, "startblock": 0,
        "endblock": 99999999, "sort": "desc",
        "offset": settings.MAX_TXS_PER_ADDR, "page": 1,
    })
    r = data.get("result", [])
    return r if isinstance(r, list) else []


def _fetch_erc20(address):
    data = _etherscan({
        "module": "account", "action": "tokentx",
        "address": address, "startblock": 0,
        "endblock": 99999999, "sort": "desc",
        "offset": settings.MAX_TXS_PER_ADDR, "page": 1,
    })
    r = data.get("result", [])
    return r if isinstance(r, list) else []


# ── Feature Engineering ───────────────────────────────────────────────────────

def _engineer_features(address, txs, erc20_txs):
    address = address.lower()
    if len(txs) < 2:
        return None

    def sf(x, d=0.0):
        try:
            return float(x)
        except Exception:
            return d

    WEI = settings.WEI
    sent = [t for t in txs if t.get("from", "").lower() == address]
    recv = [t for t in txs if t.get("to", "").lower() == address]
    sv   = [sf(t.get("value", 0)) * WEI for t in sent]
    rv   = [sf(t.get("value", 0)) * WEI for t in recv]

    def get_ts(tl):
        return sorted([int(t.get("timeStamp", 0)) for t in tl if t.get("timeStamp")])

    def avg_gap(ts):
        if len(ts) < 2:
            return 0.0
        return float(np.mean([(ts[i + 1] - ts[i]) / 60 for i in range(len(ts) - 1)]))

    all_ts = get_ts(txs)
    sts    = get_ts(sent)
    rts    = get_ts(recv)
    age    = (all_ts[-1] - all_ts[0]) / 60 if len(all_ts) >= 2 else 0.0
    uto    = {t.get("to", "").lower() for t in sent if t.get("to")}
    ufr    = {t.get("from", "").lower() for t in recv if t.get("from")}
    gp     = [sf(t.get("gasPrice", 0)) for t in sent]
    gu     = [sf(t.get("gasUsed", 0)) for t in sent]
    fees   = [a * b * WEI for a, b in zip(gp, gu)]
    ec     = sum(1 for t in txs if t.get("isError") == "1")
    cs     = sum(1 for t in sent if t.get("input", "0x") not in ("0x", "", None))
    es     = [t for t in erc20_txs if t.get("from", "").lower() == address]
    er     = [t for t in erc20_txs if t.get("to", "").lower() == address]

    def ev(t):
        try:
            return float(t.get("value", 0)) * WEI
        except Exception:
            return 0.0

    esv  = [ev(t) for t in es]
    erv  = [ev(t) for t in er]
    econ = len({t.get("contractAddress", "").lower() for t in erc20_txs})
    ts_  = sum(sv)
    tr_  = sum(rv)

    return {
        "total_txs":                  len(txs),
        "total_sent_txs":             len(sent),
        "total_recv_txs":             len(recv),
        "contracts_created":          sum(1 for t in txs if not t.get("to")),
        "error_count":                ec,
        "error_rate":                 ec / len(txs),
        "contract_interaction_rate":  cs / (len(sent) + 1),
        "account_age_mins":           age,
        "avg_time_between_sent":      avg_gap(sts),
        "avg_time_between_recv":      avg_gap(rts),
        "total_eth_sent":             ts_,
        "avg_eth_sent":               float(np.mean(sv)) if sv else 0.0,
        "std_eth_sent":               float(np.std(sv)) if sv else 0.0,
        "min_eth_sent":               min(sv) if sv else 0.0,
        "max_eth_sent":               max(sv) if sv else 0.0,
        "total_eth_recv":             tr_,
        "avg_eth_recv":               float(np.mean(rv)) if rv else 0.0,
        "std_eth_recv":               float(np.std(rv)) if rv else 0.0,
        "min_eth_recv":               min(rv) if rv else 0.0,
        "max_eth_recv":               max(rv) if rv else 0.0,
        "avg_gas_price":              float(np.mean(gp)) if gp else 0.0,
        "avg_gas_used":               float(np.mean(gu)) if gu else 0.0,
        "avg_tx_fee_eth":             float(np.mean(fees)) if fees else 0.0,
        "total_fees_eth":             sum(fees),
        "unique_recipients":          len(uto),
        "unique_senders":             len(ufr),
        "unique_counterparties":      len(uto | ufr),
        "erc20_total_txs":            len(erc20_txs),
        "erc20_unique_contracts":     econ,
        "erc20_total_sent":           sum(esv),
        "erc20_total_recv":           sum(erv),
        "in_out_ratio":               len(recv) / (len(sent) + 1),
        "net_eth_balance":            tr_ - ts_,
        "send_concentration":         (max(sv) / (sum(sv) + 1e-9)) if sv else 0.0,
    }


# ── Graph Builder ─────────────────────────────────────────────────────────────

def build_transaction_graph(root_address, progress_callback=None):
    G          = nx.DiGraph()
    addr_feats = {}
    visited    = set()
    frontier   = {root_address.lower()}
    WEI        = settings.WEI

    for hop in range(settings.MAX_HOPS + 1):
        next_frontier = set()
        if progress_callback:
            progress_callback(f"hop_{hop}", len(frontier))

        for addr in frontier:
            if addr in visited:
                continue
            visited.add(addr)

            txs   = _fetch_txs(addr)
            erc20 = _fetch_erc20(addr)
            time.sleep(0.22)

            if not txs:
                continue

            feats = _engineer_features(addr, txs, erc20)
            if feats:
                addr_feats[addr] = feats

            for tx in txs:
                src = tx.get("from", "").lower()
                dst = tx.get("to", "").lower()
                if not src or not dst:
                    continue
                val = float(tx.get("value", 0)) * WEI
                G.add_edge(src, dst,
                           hash=tx.get("hash", ""),
                           value=val,
                           timestamp=int(tx.get("timeStamp", 0)),
                           gas_used=int(tx.get("gasUsed", 0)),
                           is_error=int(tx.get("isError", 0)))
                if hop < settings.MAX_HOPS:
                    for candidate in [src, dst]:
                        if candidate not in visited:
                            next_frontier.add(candidate)

        frontier = next_frontier
        if not frontier:
            break

    logger.info(f"Graph: {G.number_of_nodes()} nodes | {G.number_of_edges()} edges")
    return G, addr_feats


# ── Scoring ───────────────────────────────────────────────────────────────────

def score_wallets(addr_feats, G):
    if not addr_feats:
        return {}

    scaler, xgb_model, sage_model, feature_cols, ensemble_cfg, device = get_models()
    addresses = list(addr_feats.keys())

    X_live = np.array(
        [[addr_feats[a].get(col, 0.0) for col in feature_cols] for a in addresses],
        dtype=np.float32,
    )
    X_live    = np.nan_to_num(X_live, nan=0.0, posinf=0.0, neginf=0.0)
    X_live_sc = scaler.transform(X_live)

    xgb_probs = xgb_model.predict_proba(X_live_sc)[:, 1]

    idx_map    = {addr: i for i, addr in enumerate(addresses)}
    edges_src, edges_dst = [], []
    for u, v in G.edges():
        if u in idx_map and v in idx_map:
            edges_src.append(idx_map[u])
            edges_dst.append(idx_map[v])

    if edges_src:
        edge_index = torch.tensor(
            [edges_src + edges_dst, edges_dst + edges_src], dtype=torch.long
        ).to(device)
    else:
        sl = list(range(len(addresses)))
        edge_index = torch.tensor([sl, sl], dtype=torch.long).to(device)

    x_t        = torch.tensor(X_live_sc, dtype=torch.float).to(device)
    sage_probs = sage_model.predict_proba(x_t, edge_index)

    # Debug log
    logger.info(f"DEBUG sage_probs: min={sage_probs.min():.4f} max={sage_probs.max():.4f} zeros={sum(sage_probs == 0)} total={len(sage_probs)}")

    xgb_w  = ensemble_cfg["xgb_weight"]
    sage_w = ensemble_cfg["sage_weight"]

    # First pass — build raw scores
    scores = {}
    for i, addr in enumerate(addresses):
        scores[addr] = {
            "xgb":  float(xgb_probs[i]),
            "sage": float(sage_probs[i]),
        }

    # Second pass — fix 0.0 GraphSAGE using neighbor average as fallback
    for addr in addresses:
        sage_val = scores[addr]["sage"]
        if sage_val == 0.0:
            neighbors = list(G.predecessors(addr)) + list(G.successors(addr))
            neighbor_sage = [
                scores[n]["sage"] for n in neighbors
                if n in scores and scores[n]["sage"] > 0.0
            ]
            if neighbor_sage:
                scores[addr]["sage"] = round(
                    sum(neighbor_sage) / len(neighbor_sage), 4
                )
                logger.info(f"Fixed sage for {addr[:10]}: 0.0 → {scores[addr]['sage']:.4f} (avg of {len(neighbor_sage)} neighbors)")
            else:
                # No neighbors with sage scores — use xgb as fallback
                scores[addr]["sage"] = scores[addr]["xgb"]
                logger.info(f"Fixed sage for {addr[:10]}: 0.0 → {scores[addr]['sage']:.4f} (xgb fallback)")

        ens = xgb_w * scores[addr]["xgb"] + sage_w * scores[addr]["sage"]
        scores[addr]["ensemble"] = ens

    return scores


def score_edges(G, scores):
    edge_scores = {}
    for u, v in G.edges():
        src_score = scores.get(u, {}).get("ensemble", 0.0)
        dst_score = scores.get(v, {}).get("ensemble", 0.0)
        edge_scores[f"{u}|{v}"] = max(src_score, dst_score)
    return edge_scores


def compute_wallet_risk(root_addr, scores):
    root_addr  = root_addr.lower()
    root_score = scores.get(root_addr, {}).get("ensemble", 0.0)

    neighbor_scores = [v["ensemble"] for k, v in scores.items() if k != root_addr]
    flagged         = sum(1 for s in neighbor_scores if s > settings.FRAUD_THRESHOLD)
    frac_flagged    = flagged / len(neighbor_scores) if neighbor_scores else 0.0
    combined        = 0.5 * root_score + 0.5 * frac_flagged

    if combined < 0.3:
        rating, emoji = "LOW",    "🟢"
    elif combined < 0.6:
        rating, emoji = "MEDIUM", "🟡"
    else:
        rating, emoji = "HIGH",   "🔴"

    return {
        "root_score":       root_score,
        "frac_flagged":     frac_flagged,
        "combined":         combined,
        "rating":           rating,
        "emoji":            emoji,
        "flagged_count":    flagged,
        "total_neighbors":  len(neighbor_scores),
    }


# ── Graph → React Flow format ─────────────────────────────────────────────────

def build_react_flow_graph(G, scores, edge_scores, root_addr):
    """Convert NetworkX graph to React Flow nodes + edges."""
    root_addr = root_addr.lower()

    # Limit to top 150 nodes for performance
    if G.number_of_nodes() > 150:
        # Use BFS from root to keep connected nodes instead of top scorers
        try:
            lengths  = nx.single_source_shortest_path_length(G, root_addr)
            closest  = sorted(lengths.keys(), key=lambda n: lengths[n])[:149]
            keep     = set(closest) | {root_addr}
        except Exception:
            top  = sorted(scores, key=lambda a: scores[a]["ensemble"], reverse=True)[:120]
            keep = set(top) | {root_addr}
        G = G.subgraph(keep).copy()

    import random
    pos = nx.spring_layout(G, seed=42, k=0.9 / max(1, G.number_of_nodes() ** 0.5))

    nodes = []
    for node in G.nodes():
        score   = scores.get(node, {}).get("ensemble", 0.0)
        x, y    = pos.get(node, (random.random(), random.random()))
        is_root = node == root_addr

        if score < 0.3:
            color = "#22c55e"
        elif score < 0.5:
            color = "#eab308"
        else:
            color = "#ef4444"

        nodes.append({
            "id":       node,
            "position": {"x": float(x) * 800 + 400, "y": float(y) * 600 + 300},
            "data": {
                "label":    node[:8] + "...",
                "address":  node,
                "score":    round(score, 4),
                "xgb":      round(scores.get(node, {}).get("xgb", 0), 4),
                "sage":     round(scores.get(node, {}).get("sage", 0), 4),
                "isRoot":   is_root,
                "color":    color,
            },
            "type": "fraudNode",
        })

    edges = []
    for i, (u, v, data) in enumerate(G.edges(data=True)):
        key   = f"{u}|{v}"
        score = edge_scores.get(key, 0.0)
        color = "#ef4444" if score > settings.FRAUD_THRESHOLD else "#3b82f6"
        edges.append({
            "id":             f"e{i}",
            "source":         u,
            "target":         v,
            "data":           {"score": round(score, 4), "value": round(data.get("value", 0), 6)},
            "style":          {"stroke": color, "strokeWidth": 1.5},
            "animated":       score > settings.FRAUD_THRESHOLD,
        })

    logger.info(f"React Flow: {len(nodes)} nodes, {len(edges)} edges")
    return {"nodes": nodes, "edges": edges}