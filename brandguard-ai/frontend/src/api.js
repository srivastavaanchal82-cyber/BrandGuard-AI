import axios from "axios";
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "", timeout: 40000 });
export const BRAND_ID = "default";
export function errMsg(e) {
  const d = e.response?.data?.detail;
  if (d) return typeof d === "string" ? d : d.map?.((x) => x.msg).join("; ") || JSON.stringify(d);
  if (e.code === "ERR_NETWORK" || e.message === "Network Error") return "Cannot reach the backend. Make sure it is running on port 8000.";
  return e.message;
}
export const saveBrand = (b) => api.put(`/api/brand/${BRAND_ID}`, b).then((r) => r.data);
export const getBrand = () => api.get(`/api/brand/${BRAND_ID}`).then((r) => r.data);
export const analyse = (text) => api.post("/api/prevent/analyse", { text, brand_id: BRAND_ID }).then((r) => r.data);
export const compare = (c) => api.post("/api/protect/campaign-compare", c).then((r) => r.data);
export const review = (analysis_id, decision, review_type) => api.post("/api/reviews", { analysis_id, decision, review_type }).then((r) => r.data);
export const getReviews = () => api.get("/api/reviews").then((r) => r.data);
export const getStats = () => api.get("/api/stats").then((r) => r.data);
export const getHealth = () => api.get("/api/health").then((r) => r.data);
export const analyseImage = (file, approved_discount, approved_website) => {
  const f = new FormData(); f.append("file", file); f.append("approved_discount", approved_discount); f.append("approved_website", approved_website); f.append("brand_id", BRAND_ID);
  return api.post("/api/protect/analyse-image", f, { timeout: 150000 }).then((r) => r.data);
};
