import { apiClient } from "./api-client";
import type { ApiResponse, PaginatedData } from "./types";

export interface Batch {
  id: string;
  name: string;
  courseId?: string;
  courseName?: string;
  startDate?: string;
  endDate?: string;
}

export async function getBatches(
  search?: string,
): Promise<ApiResponse<PaginatedData<Batch>>> {
  const response = await apiClient.get<ApiResponse<Batch[]>>(
    "/training/batches",
    { params: { search, pageSize: 100 } },
  );
  const { data, meta } = response.data;
  return {
    message: response.data.message,
    data: {
      items: data,
      total: meta?.total ?? data.length,
      page: meta?.page ?? 1,
      pageSize: meta?.pageSize ?? data.length,
      totalPages: meta?.totalPages ?? 1,
    },
  };
}
