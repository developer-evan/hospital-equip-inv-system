import { AuthUser } from '../models/auth.model';
import { Department } from '../models/department.model';
import { Role } from '../models/role.enum';
import { User, UserDepartmentRef } from '../models/user.model';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

export function resolveEntityId(entity: unknown): string {
  const record = asRecord(entity);
  const id = record['id'];
  const mongoId = record['_id'];

  if (typeof id === 'string' && id.length > 0 && id !== 'undefined') {
    return id;
  }

  if (typeof mongoId === 'string' && mongoId.length > 0) {
    return mongoId;
  }

  if (mongoId && typeof mongoId === 'object' && 'toString' in (mongoId as object)) {
    const asString = String(mongoId);
    if (asString && asString !== '[object Object]') {
      return asString;
    }
  }

  return '';
}

function normalizeUserDepartments(raw: unknown): UserDepartmentRef[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((dept): UserDepartmentRef => {
      if (typeof dept === 'string') {
        return { id: dept, name: dept };
      }

      const department = asRecord(dept);
      return {
        id: resolveEntityId(department),
        name: String(department['name'] ?? ''),
        code: department['code'] ? String(department['code']) : undefined,
      };
    })
    .filter((dept) => !!dept.id);
}

export function normalizeUser(raw: unknown): User {
  const record = asRecord(raw);

  return {
    id: resolveEntityId(record),
    username: String(record['username'] ?? ''),
    email: String(record['email'] ?? ''),
    fullName: String(record['fullName'] ?? ''),
    role: record['role'] as Role,
    isActive: record['isActive'] !== false,
    createdAt: record['createdAt'] as string | undefined,
    updatedAt: record['updatedAt'] as string | undefined,
    departments: normalizeUserDepartments(record['departments']),
  };
}

export function normalizeDepartment(raw: unknown): Department {
  const record = asRecord(raw);

  return {
    id: resolveEntityId(record),
    name: String(record['name'] ?? ''),
    code: String(record['code'] ?? ''),
    location: record['location'] ? String(record['location']) : undefined,
    isActive: record['isActive'] !== false,
  };
}

export function normalizeAuthUser(raw: unknown): AuthUser {
  const record = asRecord(raw);
  const departmentsRaw = Array.isArray(record['departments']) ? record['departments'] : [];

  return {
    id: resolveEntityId(record),
    username: String(record['username'] ?? ''),
    email: String(record['email'] ?? ''),
    fullName: String(record['fullName'] ?? ''),
    role: record['role'] as Role,
    departments: departmentsRaw.map((dept) =>
      typeof dept === 'string' ? dept : resolveEntityId(dept),
    ),
  };
}
