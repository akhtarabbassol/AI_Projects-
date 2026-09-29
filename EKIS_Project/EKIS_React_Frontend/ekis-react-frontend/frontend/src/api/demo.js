export const isDemoSession = () => localStorage.getItem("ekis_token") === "ekis-demo-token";

export const demoAnalytics = {
  total_documents: 12,
  ai_queries: 48,
  ai_accuracy: 94,
  time_saved_hours: 26,
  avg_response_time: "1.8s",
  source_attribution: "92%",
  top_department: "Operations",
  popular_topics: ["Company Policies", "Product Knowledge", "HR Benefits"],
  time_series: [
    { label: "Mon", value: 18 },
    { label: "Tue", value: 24 },
    { label: "Wed", value: 15 },
    { label: "Thu", value: 31 },
    { label: "Fri", value: 27 },
    { label: "Sat", value: 12 },
    { label: "Sun", value: 20 },
  ],
};

export const demoDocuments = [
  { id: "demo-1", filename: "React JS Standards.pdf", file_type: "pdf", file_size: "2.4 MB", upload_date: "Today", department_id: "react-team", department_name: "React JS", team_id: "react-team", team_name: "React JS", status: "Indexed" },
  { id: "demo-2", filename: "AI Engineering Guide.docx", file_type: "docx", file_size: "1.1 MB", upload_date: "Yesterday", department_id: "ai-team", department_name: "AI Engineering", team_id: "ai-team", team_name: "AI Engineering", status: "Indexed" },
  { id: "demo-3", filename: "Shared Company Handbook.pdf", file_type: "pdf", file_size: "860 KB", upload_date: "Yesterday", department_id: "general-team", department_name: "General", team_id: "general-team", team_name: "General", status: "Processing" },
];

export const demoTeams = [
  { id: "react-team", name: "React JS" },
  { id: "ai-team", name: "AI Engineering" },
  { id: "general-team", name: "General" },
];

export const demoUsers = [
  { id: "demo-user-1", name: "Company Admin", email: "companyadmin@gmail.com", password: "company1122@", company_id: "demo-company", company_name: "EKIS Demo Company", department_name: "Operations", role: "Admin", status: "Active" },
  { id: "demo-user-2", name: "Ayesha Khan", email: "ayesha@ekis.local", password: "Ayesha@123", company_id: "demo-company", company_name: "EKIS Demo Company", team_id: "react-team", team_name: "React JS", department_name: "React JS", role: "Member", status: "Active" },
  { id: "demo-user-3", name: "Omar Ali", email: "omar@ekis.local", password: "Omar@123", company_id: "demo-company", company_name: "EKIS Demo Company", team_id: "ai-team", team_name: "AI Engineering", department_name: "AI Engineering", role: "Member", status: "Active" },
  { id: "demo-user-4", name: "Sarah Malik", email: "sarah@northstar.local", password: "Sarah@123", company_id: "northstar-company", company_name: "Northstar Labs", team_id: "general-team", team_name: "General", department_name: "General", role: "Viewer", status: "Active" },
];

export const demoCompanies = [
  { id: "demo-company", name: "EKIS Demo Company", users: 3, status: "Active" },
  { id: "northstar-company", name: "Northstar Labs", users: 1, status: "Active" },
];

export const demoResponse = (data) => Promise.resolve({ data });
