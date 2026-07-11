export interface Department {
  id: string;
  name: string;
  code: string;
  location?: string;
  isActive?: boolean;
}

export interface CreateDepartmentDto {
  name: string;
  code: string;
  location?: string;
}
