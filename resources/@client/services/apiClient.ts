// API client using native fetch with timeout & status handling

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
        const appMode = localStorage.getItem("app_mode") || "principal";

        const isFormData = body instanceof FormData;

        const reqHeaders: Record<string, string> = {
            Accept: "application/json",
            "X-App-Mode": appMode,
            ...customHeaders,
        };

        if (!isFormData) {
            reqHeaders["Content-Type"] = "application/json";
        }

        if (token) {
            reqHeaders["Authorization"] = `Bearer ${token}`;
        }

        const url = endpoint.startsWith("http")
            ? endpoint
            : `${BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

        // Drawing analysis can take longer than ordinary API requests because
        // the server sends the uploaded file to a vision model.
        const timeoutMs = endpoint.includes("extract-drawing-specs") ? 120000 : 15000;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(url, {
                method,
                headers: reqHeaders,
                body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

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

            const responseText = await response.text();
            let json: any;
            try {
                json = responseText ? JSON.parse(responseText) : {};
            } catch {
                const errObj: any = new Error(
                    response.ok
                        ? "The server returned an invalid response. Please try again."
                        : `Server error (${response.status}). Please try again or contact support.`
                );
                errObj.response = { data: { message: errObj.message }, status: response.status };
                throw errObj;
            }

            if (!response.ok || json.status === "error") {
                const errObj: any = new Error(json.message || "Request failed");
                errObj.response = { data: json, status: response.status };
                throw errObj;
            }

            return { data: json };
        } catch (err: any) {
            clearTimeout(timeoutId);
            if (err.name === "AbortError") {
                const message = endpoint.includes("extract-drawing-specs")
                    ? "Drawing analysis is taking too long. Please try again with a smaller file."
                    : "Request timed out. Please try again.";
                const timeoutErr: any = new Error(message);
                timeoutErr.response = { data: { message }, status: 408 };
                return Promise.reject(timeoutErr);
            }
            return Promise.reject(err);
        }
    },
};

export default apiClient;
