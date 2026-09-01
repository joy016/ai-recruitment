export interface ApiResponse<T = void> {
  statusCode: number;
  statusMessage: string;
  data?: T;
}
