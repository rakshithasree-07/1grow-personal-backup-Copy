import { apiClient } from "./api-client";

export interface UploadResult {
  key: string;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface UploadResponse {
  message: string;
  data: UploadResult;
}

export async function uploadToStorage(
  file: File,
  category: string,
  subCategory?: string,
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  if (category) formData.append("category", category);
  if (subCategory) formData.append("subCategory", subCategory);

  const { data } = await apiClient.post<UploadResponse>(
    "/storage/upload",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data.data;
}

export async function deleteFromStorage(key: string): Promise<void> {
  await apiClient.post("/storage/delete", { key });
}
