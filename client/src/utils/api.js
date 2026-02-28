import axios from 'axios'

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
})

// ── WEATHER ──
export const getWeather = (city = 'Aberdeen') =>
  API.get(`/api/weather?city=${city}`).then(r => r.data)

// ── ROUTES ──
export const getRoutes = (from, to) =>
  API.get('/api/routes', { params: { from, to } }).then(r => r.data)

// ── USERS ──
export const createUser = (userData) =>
  API.post('/api/users', userData).then(r => r.data)

export const getUser = (id) =>
  API.get(`/api/users/${id}`).then(r => r.data)

// ── TRIPS ──
export const logTrip = (tripData) =>
  API.post('/api/trips', tripData).then(r => r.data)

export const getUserTrips = (userId) =>
  API.get(`/api/trips/${userId}`).then(r => r.data)

export const getUserImpact = (userId) =>
  API.get(`/api/impact/${userId}`).then(r => r.data)

// ── GROUPS ──
export const getGroup = (code) =>
  API.get(`/api/groups/${code}`).then(r => r.data)

export const joinGroup = (code, userId) =>
  API.post('/api/groups/join', { code, userId }).then(r => r.data)

export const createGroup = (userId) =>
  API.post('/api/groups/create', { userId }).then(r => r.data)
