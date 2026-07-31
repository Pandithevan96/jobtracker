// API client using native fetch to avoid missing module dependencies

const BASE_URL = "https://jobtracker-adjt.onrender.com/api/v1";

export interface ApiResponse<T = any> {
    status?: string;
    message?: string;
    data?: T;
    [key: string]: any;
}

export const apiClient = {
    async get<T = any>(
        endpoint: string,
        headers: Record<string, string> = {},
    ): Promise<{ data: T }> {
        return this.request<T>("GET", endpoint, undefined, headers);
    },

    async post<T = any>(
        endpoint: string,
        body?: any,
        headers: Record<string, string> = {},
    ): Promise<{ data: T }> {
        return this.request<T>("POST", endpoint, body, headers);
    },

    async request<T = any>(
        method: string,
        endpoint: string,
        body?: any,
        customHeaders: Record<string, string> = {},
    ): Promise<{ data: T }> {
        const token = localStorage.getItem("auth_token");

        const reqHeaders: Record<string, string> = {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...customHeaders,
        };

        if (token) {
            reqHeaders["Authorization"] = `Bearer ${token}`;
        }

        const url = endpoint.startsWith("http")
            ? endpoint
            : `${BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

        try {
            const response = await fetch(url, {
                method,
                headers: reqHeaders,
                body: body ? JSON.stringify(body) : undefined,
            });

            if (response.status === 401) {
                localStorage.removeItem("auth_token");
                localStorage.removeItem("auth_user");
                if (
                    window.location.pathname !== "/login" &&
                    window.location.pathname !== "/register"
                ) {
                    window.location.href = "/login";
                }
            }

            const json = await response.json();
            return { data: json };
        } catch (err) {
            return Promise.reject(err);
        }
    },
};

export default apiClient;
