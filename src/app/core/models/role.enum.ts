export enum Role {
  ADMINISTRATOR = 'ADMINISTRATOR',
  BIOMEDICAL_ENGINEER = 'BIOMEDICAL_ENGINEER',
  DEPARTMENT_USER = 'DEPARTMENT_USER',
  STORE_OFFICER = 'STORE_OFFICER',
}

export const ROLE_LABEL: Record<Role, string> = {
  [Role.ADMINISTRATOR]: 'Administrator',
  [Role.BIOMEDICAL_ENGINEER]: 'Biomedical Engineer',
  [Role.DEPARTMENT_USER]: 'Department User',
  [Role.STORE_OFFICER]: 'Store Officer',
};
