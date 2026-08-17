import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";

type TokenGetter = () => string | null | undefined;

type ApiClientHooks = {
  onRequest?: (
    config: InternalAxiosRequestConfig,
  ) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>;
  onRequestError?: (error: AxiosError) => unknown;
  onResponse?: <T = unknown>(response: AxiosResponse<T>) => AxiosResponse<T>;
  onResponseError?: (error: AxiosError) => unknown;
  onUnauthorized?: (error: AxiosError) => void;
};

export type ApiClientOptions = ApiClientHooks & {
  baseURL?: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
  getAccessToken?: TokenGetter;
};

const DEFAULT_TIMEOUT_MS = 15_000;

let accessTokenGetter: TokenGetter = () => null;

export const setAccessTokenGetter = (getter: TokenGetter) => {
  accessTokenGetter = getter;
};

export const clearAccessTokenGetter = () => {
  accessTokenGetter = () => null;
};

const normalizeAuthHeader = (
  config: InternalAxiosRequestConfig,
  getToken: TokenGetter,
) => {
  const token = getToken();
  if (!token) {
    return config;
  }

  config.headers = config.headers ?? {};
  if (!config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
};

const attachInterceptors = (
  instance: AxiosInstance,
  options: ApiClientOptions,
) => {
  instance.interceptors.request.use(
    async (config) => {
      const withAuth = normalizeAuthHeader(
        config,
        options.getAccessToken ?? accessTokenGetter,
      );

      if (options.onRequest) {
        return options.onRequest(withAuth);
      }

      return withAuth;
    },
    (error: AxiosError) => {
      if (options.onRequestError) {
        return options.onRequestError(error);
      }
      return Promise.reject(error);
    },
  );

  instance.interceptors.response.use(
    (response) => {
      if (options.onResponse) {
        return options.onResponse(response);
      }
      return response;
    },
    (error: AxiosError) => {
      if (error.response?.status === 401) {
        options.onUnauthorized?.(error);
      }

      if (options.onResponseError) {
        return options.onResponseError(error);
      }

      return Promise.reject(error);
    },
  );
};

export const createApiClient = (
  options: ApiClientOptions = {},
): AxiosInstance => {
  const instance = axios.create({
    baseURL: options.baseURL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
    timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  attachInterceptors(instance, options);
  return instance;
};

export const apiClient = createApiClient();

export const api = {
  get: async <TResponse>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<TResponse> => {
    const response = await apiClient.get<TResponse>(url, config);
    return response.data;
  },

  post: async <TResponse, TBody = unknown>(
    url: string,
    data?: TBody,
    config?: AxiosRequestConfig<TBody>,
  ): Promise<TResponse> => {
    const response = await apiClient.post<TResponse>(url, data, config);
    return response.data;
  },

  put: async <TResponse, TBody = unknown>(
    url: string,
    data?: TBody,
    config?: AxiosRequestConfig<TBody>,
  ): Promise<TResponse> => {
    const response = await apiClient.put<TResponse>(url, data, config);
    return response.data;
  },

  patch: async <TResponse, TBody = unknown>(
    url: string,
    data?: TBody,
    config?: AxiosRequestConfig<TBody>,
  ): Promise<TResponse> => {
    const response = await apiClient.patch<TResponse>(url, data, config);
    return response.data;
  },

  delete: async <TResponse>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<TResponse> => {
    const response = await apiClient.delete<TResponse>(url, config);
    return response.data;
  },
};
