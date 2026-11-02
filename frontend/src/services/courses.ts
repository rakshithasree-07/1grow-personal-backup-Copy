import { apiClient } from "./api-client";
import type { ApiResponse, PaginatedData } from "./types";

export interface Course {
  id: string;
  name: string;
}

export async function getCourses(
  search?: string,
): Promise<ApiResponse<PaginatedData<Course>>> {
  const response = await apiClient.get<ApiResponse<Course[]>>(
    "/training/courses",
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
