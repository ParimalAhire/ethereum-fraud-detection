import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const analyzeWallet   = (wallet)           => api.post('/fraud/analyze',  { wallet })
export const compareWallets  = (wallet_a, wallet_b) => api.post('/compare/',      { wallet_a, wallet_b })
export const getHistory      = (limit = 20)        => api.get(`/history/?limit=${limit}`)
export const deleteHistory   = (id)                => api.delete(`/history/${id}`)
export const clearCache      = (wallet)            => api.delete(`/fraud/cache/${wallet}`)
export const warmup          = ()                  => api.get('/warmup').catch(() => {})

export default api
