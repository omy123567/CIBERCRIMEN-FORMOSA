import React, { createContext, useContext, useMemo } from 'react';
import { SisPolUser } from '../types/sgp';

export interface ResolvedPermissions {
  isSuperuser: boolean;
  readOnly: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
  canResetCounters: boolean;
  canAdminModules: boolean;
}

export function resolveUserPermissions(user?: SisPolUser | null): ResolvedPermissions {
  if (!user) {
    return {
      isSuperuser: false,
      readOnly: true,
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canExport: false,
      canResetCounters: false,
      canAdminModules: false
    };
  }

  if (user.rol === 'superusuario') {
    return {
      isSuperuser: true,
      readOnly: false,
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canExport: true,
      canResetCounters: true,
      canAdminModules: true
    };
  }

  const rolLower = (user.rol || '').toLowerCase();
  const inferredReadOnly =
    user.readOnly !== undefined
      ? Boolean(user.readOnly)
      : rolLower === 'solo lectura' || rolLower === 'auditor';

  if (inferredReadOnly) {
    return {
      isSuperuser: false,
      readOnly: true,
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canExport: user.canExport !== undefined ? Boolean(user.canExport) : true,
      canResetCounters: false,
      canAdminModules: false
    };
  }

  const canCreate = user.canCreate !== undefined ? Boolean(user.canCreate) : true;
  const canEdit =
    user.canEdit !== undefined
      ? Boolean(user.canEdit)
      : rolLower === 'cargador de datos'
      ? false
      : true;
  const canDelete = Boolean(user.canDelete);
  const canExport = user.canExport !== undefined ? Boolean(user.canExport) : true;
  const canResetCounters =
    user.canResetCounters !== undefined
      ? Boolean(user.canResetCounters)
      : rolLower === 'administrador' || rolLower === 'jefe de turno';
  const canAdminModules = Boolean(user.canAdminModules);

  return {
    isSuperuser: false,
    readOnly: !canCreate && !canEdit && !canDelete,
    canCreate,
    canEdit,
    canDelete,
    canExport,
    canResetCounters,
    canAdminModules
  };
}

const PermissionsContext = createContext<ResolvedPermissions | null>(null);

export const PermissionsProvider: React.FC<{
  user: SisPolUser | null;
  children: React.ReactNode;
}> = ({ user, children }) => {
  const value = useMemo(() => resolveUserPermissions(user), [user]);
  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
};

export function usePermissions(): ResolvedPermissions {
  const ctx = useContext(PermissionsContext);
  if (ctx) return ctx;

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('sispol_current_user');
      if (raw) {
        return resolveUserPermissions(JSON.parse(raw));
      }
    } catch {
      // ignore parse errors
    }
  }

  return {
    isSuperuser: false,
    readOnly: false,
    canCreate: true,
    canEdit: true,
    canDelete: false,
    canExport: true,
    canResetCounters: false,
    canAdminModules: false
  };
}
