export interface CategoryDTO {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  order: number;
  isActive: boolean;
  children: CategoryDTO[];
  createdAt: string;
  updatedAt: string;
}