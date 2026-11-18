import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  Shield,
  Trash2,
  Edit2,
  Check,
  X,
  AlertCircle,
  Building2,
  Lock,
  Mail,
  User as UserIcon,
  ShieldAlert,
  Eye,
  SlidersHorizontal,
  Key,
  Layers,
  CheckSquare,
  Square,
  Search,
  Filter,
  FolderTree,
  EyeOff,
  FilePlus2,
  RotateCcw,
  Download,
  CheckCircle2
} from 'lucide-react';
import { SisPolUser, SisPolDelegacion, UserRole, CustomRoleDefinition } from '../../types/sgp';
import { sgpManager, sanitizeClientUser } from '../../db/dexieDb';
import { usePermissions } from '../../context/PermissionsContext';
import { ConfirmDialog } from '../common/ConfirmDialog';

const AVAILABLE_MODULES = [
  { id: 'dashboard', label: 'Dashboard Ejecutivo', category: 'General', superuserOnly: false },
  { id: 'tareas', label: 'Tareas Realizadas y Auditoría', category: 'Operativo', superuserOnly: false },
  { id: 'expedientes', label: 'Expedientes & Evidencias', category: 'Judicial', superuserOnly: false },
  { id: 'numerario', label: 'Numerario & Control de Folios', category: 'Oficial', superuserOnly: false },
  { id: 'ppi', label: 'Causas PPI (Policial)', category: 'Judicial', superuserOnly: false },
  { id: 'personas', label: 'Personas (Evidencias)', category: 'Investigación', superuserOnly: false },
  { id: 'personal', label: 'Personal & Legajos', category: 'Recursos Humanos', superuserOnly: false },
  { id: 'licencias', label: 'Licencias & Cuatrienio', category: 'Recursos Humanos', superuserOnly: false },
  { id: 'moviles', label: 'Parque Automotor', category: 'Logística', superuserOnly: false },
  { id: 'recargos', label: 'Recargos de Servicio', category: 'Recursos Humanos', superuserOnly: false },
  { id: 'charlas', label: 'Charlas y Prevención', category: 'Comunidad', superuserOnly: false },
  { id: 'membrete', label: 'Membrete Oficial', category: 'Configuración', superuserOnly: false },
  { id: 'catalogos', label: 'Catálogos Dinámicos', category: 'Configuración', superuserOnly: false },
  { id: 'respaldos', label: 'Respaldos & Depuración por Período', category: 'Configuración', superuserOnly: false },
  { id: 'usuarios', label: 'Gestión de Usuarios y Roles', category: 'Seguridad', superuserOnly: false },
  { id: 'modulos', label: 'Administrador de Módulos', category: 'Sistema', superuserOnly: false },
  { id: 'auditoria', label: 'Auditoría y Trazabilidad (Superusuario)', category: 'Seguridad', superuserOnly: true }
];

const SYSTEM_ROLE_NAMES = [
  'Solo Lectura',
  'Cargador de Datos',
  'Operador',
  'Perito Forense',
  'Jefe de Turno',
  'Auditor',
  'Administrador',
  'superusuario'
];

interface UsersManagementModuleProps {
  currentUser: SisPolUser;
  delegaciones: SisPolDelegacion[];
  onRefresh: () => void;
}

export const UsersManagementModule: React.FC<UsersManagementModuleProps> = ({
  currentUser,
  delegaciones,
  onRefresh
}) => {
  const perms = usePermissions();
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [users, setUsers] = useState<SisPolUser[]>([]);
  const [roles, setRoles] = useState<CustomRoleDefinition[]>([]);

  // User Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SisPolUser | null>(null);

  // User Form State
  const [nombreApellido, setNombreApellido] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [deleteUserConfirm, setDeleteUserConfirm] = useState<{ id: number; username: string } | null>(null);
  const [deleteRoleConfirm, setDeleteRoleConfirm] = useState<CustomRoleDefinition | null>(null);
  const [rol, setRol] = useState<UserRole>('Operador');
  const [delegacionId, setDelegacionId] = useState<number>(delegaciones[0]?.id || 1);
  const [canCreate, setCanCreate] = useState<boolean>(true);
  const [canEdit, setCanEdit] = useState<boolean>(true);
  const [canDelete, setCanDelete] = useState<boolean>(false);
  const [readOnly, setReadOnly] = useState<boolean>(false);
  const [canExport, setCanExport] = useState<boolean>(true);
  const [canResetCounters, setCanResetCounters] = useState<boolean>(false);
  const [canAdminModules, setCanAdminModules] = useState<boolean>(false);
  const [allowedDelegacionIds, setAllowedDelegacionIds] = useState<number[]>([delegaciones[0]?.id || 1]);
  const [allowedModules, setAllowedModules] = useState<string[]>([
    'dashboard',
    'expedientes',
    'numerario',
    'ppi',
    'personas',
    'personal',
    'licencias',
    'moviles',
    'recargos',
    'charlas'
  ]);
  const [userError, setUserError] = useState<string | null>(null);

  // Role Modal State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRoleDefinition | null>(null);

  // Role Form State
  const [roleNombre, setRoleNombre] = useState('');
  const [roleDescripcion, setRoleDescripcion] = useState('');
  const [roleCanCreate, setRoleCanCreate] = useState(true);
  const [roleCanEdit, setRoleCanEdit] = useState(true);
  const [roleCanDelete, setRoleCanDelete] = useState(false);
  const [roleReadOnly, setRoleReadOnly] = useState(false);
  const [roleCanExport, setRoleCanExport] = useState(true);
  const [roleCanResetCounters, setRoleCanResetCounters] = useState(false);
  const [roleAllDelegaciones, setRoleAllDelegaciones] = useState(false);
  const [roleCanAdminModules, setRoleCanAdminModules] = useState(false);
  const [roleAllowedModules, setRoleAllowedModules] = useState<string[]>([
    'dashboard',
    'expedientes',
    'numerario',
    'ppi',
    'personas'
  ]);
  const [roleError, setRoleError] = useState<string | null>(null);

  const visibleAvailableModules = useMemo(
    () => AVAILABLE_MODULES.filter(m => !m.superuserOnly || currentUser.rol === 'superusuario'),
    [currentUser.rol]
  );

  // User Filters State
  const [showUserFilters, setShowUserFilters] = useState(true);
  const [searchUser, setSearchUser] = useState('');
  const [filterUserRole, setFilterUserRole] = useState('TODOS');
  const [filterUserDelegacion, setFilterUserDelegacion] = useState('TODAS');
  const [filterUserCanDelete, setFilterUserCanDelete] = useState<'TODOS' | 'SI' | 'NO'>('TODOS');
  const [filterUserCanAdminModules, setFilterUserCanAdminModules] = useState<'TODOS' | 'SI' | 'NO'>('TODOS');

  // Role Filters State
  const [showRoleFilters, setShowRoleFilters] = useState(true);
  const [searchRole, setSearchRole] = useState('');
  const [filterRoleType, setFilterRoleType] = useState<'TODOS' | 'SISTEMA' | 'PERSONALIZADO'>('TODOS');
  const [filterRoleCanDelete, setFilterRoleCanDelete] = useState<'TODOS' | 'SI' | 'NO'>('TODOS');

  const activeUserFiltersCount = useMemo(() => {
    let count = 0;
    if (searchUser.trim()) count++;
    if (filterUserRole !== 'TODOS') count++;
    if (filterUserDelegacion !== 'TODAS') count++;
    if (filterUserCanDelete !== 'TODOS') count++;
    if (filterUserCanAdminModules !== 'TODOS') count++;
    return count;
  }, [searchUser, filterUserRole, filterUserDelegacion, filterUserCanDelete, filterUserCanAdminModules]);

  const handleClearUserFilters = () => {
    setSearchUser('');
    setFilterUserRole('TODOS');
    setFilterUserDelegacion('TODAS');
    setFilterUserCanDelete('TODOS');
    setFilterUserCanAdminModules('TODOS');
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (searchUser.trim()) {
        const query = searchUser.toLowerCase();
        const userDel = delegaciones.find(d => d.id === u.delegacionId);
        const matchName = u.nombreApellido?.toLowerCase().includes(query);
        const matchUsername = u.username?.toLowerCase().includes(query);
        const matchEmail = u.email?.toLowerCase().includes(query);
        const matchDel = (userDel?.nombre + ' ' + userDel?.ciudad + ' ' + userDel?.codigo).toLowerCase().includes(query);
        if (!matchName && !matchUsername && !matchEmail && !matchDel) return false;
      }
      if (filterUserRole !== 'TODOS' && u.rol !== filterUserRole) return false;
      if (filterUserDelegacion !== 'TODAS' && String(u.delegacionId) !== filterUserDelegacion) return false;
      if (filterUserCanDelete === 'SI' && !u.canDelete && u.rol !== 'superusuario') return false;
      if (filterUserCanDelete === 'NO' && (u.canDelete || u.rol === 'superusuario')) return false;
      const userHasAdminMods = u.rol === 'superusuario' || Boolean(u.canAdminModules);
      if (filterUserCanAdminModules === 'SI' && !userHasAdminMods) return false;
      if (filterUserCanAdminModules === 'NO' && userHasAdminMods) return false;
      return true;
    });
  }, [users, searchUser, filterUserRole, filterUserDelegacion, filterUserCanDelete, filterUserCanAdminModules, delegaciones]);

  const activeRoleFiltersCount = useMemo(() => {
    let count = 0;
    if (searchRole.trim()) count++;
    if (filterRoleType !== 'TODOS') count++;
    if (filterRoleCanDelete !== 'TODOS') count++;
    return count;
  }, [searchRole, filterRoleType, filterRoleCanDelete]);

  const handleClearRoleFilters = () => {
    setSearchRole('');
    setFilterRoleType('TODOS');
    setFilterRoleCanDelete('TODOS');
  };

  const filteredRoles = useMemo(() => {
    return roles.filter(r => {
      if (searchRole.trim()) {
        const query = searchRole.toLowerCase();
        const matchName = r.nombre?.toLowerCase().includes(query);
        const matchDesc = r.descripcion?.toLowerCase().includes(query);
        const matchModules = r.allowedModules?.some(m => m.toLowerCase().includes(query));
        if (!matchName && !matchDesc && !matchModules) return false;
      }
      if (filterRoleType === 'SISTEMA' && !r.isSystem) return false;
      if (filterRoleType === 'PERSONALIZADO' && r.isSystem) return false;
      if (filterRoleCanDelete === 'SI' && !r.canDelete) return false;
      if (filterRoleCanDelete === 'NO' && r.canDelete) return false;
      return true;
    });
  }, [roles, searchRole, filterRoleType, filterRoleCanDelete]);

  const loadData = async () => {
    const [uList, rList] = await Promise.all([
      sgpManager.getUsers(),
      sgpManager.getRoles()
    ]);
    setUsers(uList);
    setRoles(rList);
  };

  useEffect(() => {
    loadData();
  }, []);

  // When a user selects a role in the user modal, auto-populate permissions
  const handleRoleSelectionChange = (newRoleName: string) => {
    setRol(newRoleName);
    const foundRole = roles.find(r => r.nombre.toLowerCase() === newRoleName.toLowerCase());
    if (foundRole) {
      const ro = Boolean(foundRole.readOnly);
      setReadOnly(ro);
      setCanCreate(ro ? false : foundRole.canCreate !== false);
      setCanEdit(ro ? false : foundRole.canEdit !== false);
      setCanDelete(ro ? false : Boolean(foundRole.canDelete));
      setCanExport(foundRole.canExport !== false);
      setCanResetCounters(ro ? false : Boolean(foundRole.canResetCounters));
      setAllowedModules([...foundRole.allowedModules]);
      setCanAdminModules(ro ? false : Boolean(foundRole.canAdminModules));
      if (foundRole.allDelegacionesAccess) {
        setAllowedDelegacionIds(delegaciones.map(d => d.id!));
      } else {
        setAllowedDelegacionIds([delegacionId]);
      }
      return;
    }

    if (newRoleName === 'superusuario') {
      setReadOnly(false);
      setCanCreate(true);
      setCanEdit(true);
      setCanDelete(true);
      setCanExport(true);
      setCanResetCounters(true);
      setAllowedModules(AVAILABLE_MODULES.map(m => m.id));
      setAllowedDelegacionIds(delegaciones.map(d => d.id!));
      setCanAdminModules(true);
    } else if (newRoleName === 'Administrador') {
      setReadOnly(false);
      setCanCreate(true);
      setCanEdit(true);
      setCanDelete(true);
      setCanExport(true);
      setCanResetCounters(true);
      setAllowedModules(AVAILABLE_MODULES.filter(m => !m.superuserOnly && m.id !== 'modulos').map(m => m.id));
      setAllowedDelegacionIds([delegacionId]);
      setCanAdminModules(true);
    } else if (newRoleName === 'Solo Lectura') {
      setReadOnly(true);
      setCanCreate(false);
      setCanEdit(false);
      setCanDelete(false);
      setCanExport(true);
      setCanResetCounters(false);
      setAllowedModules(['dashboard', 'expedientes', 'numerario', 'ppi', 'personas', 'personal', 'licencias', 'moviles', 'recargos', 'charlas']);
      setAllowedDelegacionIds([delegacionId]);
      setCanAdminModules(false);
    } else if (newRoleName === 'Cargador de Datos') {
      setReadOnly(false);
      setCanCreate(true);
      setCanEdit(false);
      setCanDelete(false);
      setCanExport(true);
      setCanResetCounters(false);
      setAllowedModules(['dashboard', 'expedientes', 'numerario', 'ppi', 'personas', 'personal', 'licencias', 'moviles', 'recargos', 'charlas']);
      setAllowedDelegacionIds([delegacionId]);
      setCanAdminModules(false);
    } else if (newRoleName === 'Auditor') {
      setReadOnly(true);
      setCanCreate(false);
      setCanEdit(false);
      setCanDelete(false);
      setCanExport(true);
      setCanResetCounters(false);
      setAllowedModules(['dashboard', 'tareas', 'expedientes', 'numerario', 'ppi', 'personas', 'personal', 'licencias', 'moviles', 'recargos', 'charlas']);
      setAllowedDelegacionIds(delegaciones.map(d => d.id!));
      setCanAdminModules(false);
    } else if (newRoleName === 'Jefe de Turno') {
      setReadOnly(false);
      setCanCreate(true);
      setCanEdit(true);
      setCanDelete(false);
      setCanExport(true);
      setCanResetCounters(true);
      setAllowedModules(['dashboard', 'expedientes', 'numerario', 'ppi', 'personas', 'personal', 'licencias', 'moviles', 'recargos', 'charlas']);
      setAllowedDelegacionIds([delegacionId]);
      setCanAdminModules(false);
    } else {
      setReadOnly(false);
      setCanCreate(true);
      setCanEdit(true);
      setCanDelete(false);
      setCanExport(true);
      setCanResetCounters(false);
      setAllowedModules(['dashboard', 'expedientes', 'numerario', 'ppi', 'personas', 'personal', 'licencias', 'moviles', 'recargos', 'charlas']);
      setAllowedDelegacionIds([delegacionId]);
      setCanAdminModules(false);
    }
  };

  // User Actions
  const openCreateUserModal = () => {
    if (!perms.canCreate) return;
    setEditingUser(null);
    setNombreApellido('');
    setEmail('');
    setUsername('');
    setPassword('');
    setShowPassword(false);
    setRol('Operador');
    const initialDel = currentUser.delegacionId || delegaciones[0]?.id || 1;
    setDelegacionId(initialDel);
    setReadOnly(false);
    setCanCreate(true);
    setCanEdit(true);
    setCanDelete(false);
    setCanExport(true);
    setCanResetCounters(false);
    setCanAdminModules(false);
    setAllowedDelegacionIds([initialDel]);
    setAllowedModules([
      'dashboard',
      'expedientes',
      'numerario',
      'ppi',
      'personas',
      'personal',
      'licencias',
      'moviles',
      'recargos',
      'charlas'
    ]);
    setUserError(null);
    setIsUserModalOpen(true);
  };

  const openEditUserModal = (u: SisPolUser) => {
    if (!perms.canEdit) return;
    const isSuper = u.rol === 'superusuario';
    const isRo = isSuper ? false : Boolean(u.readOnly);
    setEditingUser(u);
    setNombreApellido(u.nombreApellido);
    setEmail(u.email);
    setUsername(u.username);
    setPassword('');
    setShowPassword(false);
    setRol(u.rol);
    setDelegacionId(u.delegacionId);
    setReadOnly(isRo);
    setCanCreate(isSuper ? true : (isRo ? false : u.canCreate !== false));
    setCanEdit(isSuper ? true : (isRo ? false : u.canEdit !== false));
    setCanDelete(isSuper ? true : (isRo ? false : Boolean(u.canDelete)));
    setCanExport(isSuper ? true : u.canExport !== false);
    setCanResetCounters(isSuper ? true : (isRo ? false : Boolean(u.canResetCounters)));
    setCanAdminModules(isSuper ? true : (isRo ? false : Boolean(u.canAdminModules)));
    setAllowedDelegacionIds(u.allowedDelegacionIds || [u.delegacionId]);
    setAllowedModules(u.allowedModules || visibleAvailableModules.map(m => m.id));
    setUserError(null);
    setIsUserModalOpen(true);
  };

  const handleToggleUserModule = (modId: string) => {
    setAllowedModules(prev =>
      prev.includes(modId) ? prev.filter(m => m !== modId) : [...prev, modId]
    );
  };

  const handleToggleDelegacionAccess = (dId: number) => {
    setAllowedDelegacionIds(prev =>
      prev.includes(dId) ? (prev.length > 1 ? prev.filter(id => id !== dId) : prev) : [...prev, dId]
    );
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser ? !perms.canEdit : !perms.canCreate) return;
    setUserError(null);

    if (!nombreApellido.trim() || !email.trim() || !username.trim()) {
      setUserError('Apellido y Nombre, Correo y Usuario son obligatorios.');
      return;
    }

    const cleanPass = password.trim();
    if (!editingUser && !cleanPass) {
      setUserError('Debe asignar una contraseña inicial para el nuevo usuario.');
      return;
    }

    if (cleanPass && (cleanPass.length < 8 || !/[A-Za-z]/.test(cleanPass) || !/\d/.test(cleanPass))) {
      setUserError('La contraseña debe tener al menos 8 caracteres e incluir letras y números.');
      return;
    }

    try {
      const finalAllowedDelegaciones = Array.from(new Set([...allowedDelegacionIds, delegacionId]));

      const isSuper = rol === 'superusuario';
      const effectiveReadOnly = isSuper ? false : readOnly;
      const sanitizedModules = isSuper
        ? allowedModules
        : allowedModules.filter(m => m !== 'auditoria');

      const userData: SisPolUser = {
        nombreApellido: nombreApellido.trim(),
        email: email.trim(),
        username: username.trim(),
        ...(cleanPass ? { password: cleanPass } : {}),
        rol,
        delegacionId,
        readOnly: effectiveReadOnly,
        canCreate: isSuper ? true : (effectiveReadOnly ? false : canCreate),
        canEdit: isSuper ? true : (effectiveReadOnly ? false : canEdit),
        canDelete: isSuper ? true : (effectiveReadOnly ? false : canDelete),
        canExport: isSuper ? true : canExport,
        canResetCounters: isSuper ? true : (effectiveReadOnly ? false : canResetCounters),
        allowedModules: sanitizedModules,
        allowedDelegacionIds: isSuper ? delegaciones.map(d => d.id!) : finalAllowedDelegaciones,
        canAdminModules: isSuper ? true : (effectiveReadOnly ? false : canAdminModules)
      };

      if (editingUser && editingUser.id) {
        await sgpManager.updateUser(editingUser.id, userData);
        if (editingUser.id === currentUser.id || editingUser.username === currentUser.username) {
          const updatedCurrent = sanitizeClientUser({ ...currentUser, ...userData, id: editingUser.id });
          localStorage.setItem('sispol_current_user', JSON.stringify(updatedCurrent));
        }
      } else {
        await sgpManager.addUser(userData);
      }

      await loadData();
      onRefresh();
      setIsUserModalOpen(false);
      setActionFeedback({
        success: true,
        message: editingUser
          ? `Usuario "${username.trim()}" actualizado correctamente.`
          : `Usuario "${username.trim()}" registrado correctamente.`
      });
    } catch (err: any) {
      console.error(err);
      setUserError(err.message || 'Error al guardar el usuario.');
    }
  };

  const handleDeleteUser = (id: number, uRole: UserRole, uname: string) => {
    if (!perms.canDelete) return;
    if (uRole === 'superusuario') {
      setActionFeedback({ success: false, message: 'No es posible eliminar al Superusuario del sistema.' });
      return;
    }
    setDeleteUserConfirm({ id, username: uname });
  };

  const executeDeleteUser = async () => {
    if (!deleteUserConfirm) return;
    try {
      await sgpManager.deleteUser(deleteUserConfirm.id);
      await loadData();
      onRefresh();
      setActionFeedback({ success: true, message: `Usuario "${deleteUserConfirm.username}" eliminado.` });
    } catch (err: any) {
      setActionFeedback({ success: false, message: err?.message || 'Error al eliminar el usuario.' });
    } finally {
      setDeleteUserConfirm(null);
    }
  };

  // Role Actions
  const openCreateRoleModal = () => {
    if (!perms.canCreate) return;
    setEditingRole(null);
    setRoleNombre('');
    setRoleDescripcion('');
    setRoleReadOnly(false);
    setRoleCanCreate(true);
    setRoleCanEdit(true);
    setRoleCanDelete(false);
    setRoleCanExport(true);
    setRoleCanResetCounters(false);
    setRoleAllDelegaciones(false);
    setRoleCanAdminModules(false);
    setRoleAllowedModules([
      'dashboard',
      'expedientes',
      'numerario',
      'ppi',
      'personas'
    ]);
    setRoleError(null);
    setIsRoleModalOpen(true);
  };

  const openEditRoleModal = (r: CustomRoleDefinition) => {
    if (!perms.canEdit) return;
    const isSuper = r.nombre === 'superusuario';
    const isRo = isSuper ? false : Boolean(r.readOnly);
    setEditingRole(r);
    setRoleNombre(r.nombre);
    setRoleDescripcion(r.descripcion || '');
    setRoleReadOnly(isRo);
    setRoleCanCreate(isSuper ? true : (isRo ? false : r.canCreate !== false));
    setRoleCanEdit(isSuper ? true : (isRo ? false : r.canEdit !== false));
    setRoleCanDelete(isSuper ? true : (isRo ? false : Boolean(r.canDelete)));
    setRoleCanExport(isSuper ? true : r.canExport !== false);
    setRoleCanResetCounters(isSuper ? true : (isRo ? false : Boolean(r.canResetCounters)));
    setRoleAllDelegaciones(!!r.allDelegacionesAccess);
    setRoleCanAdminModules(isSuper ? true : (isRo ? false : !!r.canAdminModules));
    setRoleAllowedModules(r.allowedModules || []);
    setRoleError(null);
    setIsRoleModalOpen(true);
  };

  const handleToggleRoleModule = (modId: string) => {
    setRoleAllowedModules(prev =>
      prev.includes(modId) ? prev.filter(m => m !== modId) : [...prev, modId]
    );
  };

  const handleSelectAllRoleModules = () => {
    setRoleAllowedModules(visibleAvailableModules.map(m => m.id));
  };

  const handleDeselectAllRoleModules = () => {
    setRoleAllowedModules(['dashboard']);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRole ? !perms.canEdit : !perms.canCreate) return;
    setRoleError(null);

    if (!roleNombre.trim()) {
      setRoleError('El nombre del rol es obligatorio.');
      return;
    }

    if (roleAllowedModules.length === 0) {
      setRoleError('Debe autorizar al menos un módulo para este rol.');
      return;
    }

    try {
      const isSuperRole = roleNombre.trim() === 'superusuario';
      const ro = isSuperRole ? false : roleReadOnly;
      const roleData: CustomRoleDefinition = {
        nombre: roleNombre.trim(),
        descripcion: roleDescripcion.trim(),
        readOnly: ro,
        canCreate: isSuperRole ? true : (ro ? false : roleCanCreate),
        canEdit: isSuperRole ? true : (ro ? false : roleCanEdit),
        canDelete: isSuperRole ? true : (ro ? false : roleCanDelete),
        canExport: isSuperRole ? true : roleCanExport,
        canResetCounters: isSuperRole ? true : (ro ? false : roleCanResetCounters),
        allDelegacionesAccess: isSuperRole ? true : roleAllDelegaciones,
        canAdminModules: isSuperRole ? true : (ro ? false : roleCanAdminModules),
        allowedModules: isSuperRole ? roleAllowedModules : roleAllowedModules.filter(m => m !== 'auditoria'),
        isSystem: editingRole ? editingRole.isSystem : false
      };

      if (editingRole && editingRole.id) {
        await sgpManager.updateRole(editingRole.id, roleData);
      } else {
        await sgpManager.addRole(roleData);
      }

      await loadData();
      setIsRoleModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setRoleError(err.message || 'Error al guardar el rol.');
    }
  };

  const handleDeleteRole = (r: CustomRoleDefinition) => {
    if (!perms.canDelete) return;
    if (r.isSystem) {
      setActionFeedback({
        success: false,
        message: 'Los roles base del sistema (Operador, Administrador, Superusuario) están protegidos y no pueden eliminarse.'
      });
      return;
    }
    if (!r.id) return;
    setDeleteRoleConfirm(r);
  };

  const executeDeleteRole = async () => {
    if (!deleteRoleConfirm?.id) return;
    try {
      await sgpManager.deleteRole(deleteRoleConfirm.id);
      await loadData();
      setActionFeedback({ success: true, message: `Rol "${deleteRoleConfirm.nombre}" eliminado.` });
    } catch (err: any) {
      setActionFeedback({ success: false, message: err?.message || 'Error al eliminar el rol.' });
    } finally {
      setDeleteRoleConfirm(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 text-blue-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Gestión de Usuarios, Roles y Permisos Granulares
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Crea roles personalizados, especifica permisos detallados por módulo y administra los funcionarios del sistema.
            </p>
          </div>
        </div>

        {/* Tab Selector & Main Action */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'users'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Usuarios ({users.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'roles'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Roles & Permisos ({roles.length})</span>
            </button>
          </div>

          {perms.canCreate && (activeTab === 'users' ? (
            <button
              onClick={openCreateUserModal}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nuevo Usuario</span>
            </button>
          ) : (
            <button
              onClick={openCreateRoleModal}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nuevo Rol Personalizado</span>
            </button>
          ))}
        </div>
      </div>

      {actionFeedback && (
        <div
          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-2 text-xs font-medium ${
            actionFeedback.success
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button onClick={() => setActionFeedback(null)} className="opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ======================= TAB 1: USERS ======================= */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Collapsible Filter Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowUserFilters(!showUserFilters)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    showUserFilters
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>{showUserFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}</span>
                  {activeUserFiltersCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-black">
                      {activeUserFiltersCount}
                    </span>
                  )}
                </button>

                {activeUserFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={handleClearUserFilters}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Limpiar filtros</span>
                  </button>
                )}
              </div>

              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Mostrando <strong className="text-slate-900 dark:text-white">{filteredUsers.length}</strong> de <strong className="text-slate-900 dark:text-white">{users.length}</strong> usuarios
              </div>
            </div>

            {showUserFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
                {/* Search query */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                    placeholder="Buscar funcionario, usuario, email..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* Role select */}
                <div>
                  <select
                    value={filterUserRole}
                    onChange={(e) => setFilterUserRole(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="TODOS">Todos los roles</option>
                    {roles.map(r => (
                      <option key={r.nombre} value={r.nombre}>{r.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Delegacion select */}
                <div>
                  <select
                    value={filterUserDelegacion}
                    onChange={(e) => setFilterUserDelegacion(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="TODAS">Todas las delegaciones</option>
                    {delegaciones.map(d => (
                      <option key={d.id} value={String(d.id)}>{d.nombre} ({d.ciudad})</option>
                    ))}
                  </select>
                </div>

                {/* Delete permission */}
                <div>
                  <select
                    value={filterUserCanDelete}
                    onChange={(e) => setFilterUserCanDelete(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="TODOS">Permiso borrado: Todos</option>
                    <option value="SI">Solo autorizados a borrar</option>
                    <option value="NO">Solo no autorizados</option>
                  </select>
                </div>

                {/* Customize modules permission */}
                <div>
                  <select
                    value={filterUserCanAdminModules}
                    onChange={(e) => setFilterUserCanAdminModules(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="TODOS">Personalizar Módulos: Todos</option>
                    <option value="SI">Solo autorizados a personalizar</option>
                    <option value="NO">Solo sin permiso</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">Funcionario / Nombre</th>
                    <th className="p-3.5">Usuario / Correo</th>
                    <th className="p-3.5">Rol Policial</th>
                    <th className="p-3.5">Delegación Asignada</th>
                    <th className="p-3.5">Permisos de Acción</th>
                    <th className="p-3.5 text-center">Admin Módulos</th>
                    <th className="p-3.5">Otras Delegaciones</th>
                    <th className="p-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUsers.map((u) => {
                    const userDel = delegaciones.find(d => d.id === u.delegacionId);
                    const hasCrossDelegation = u.rol === 'superusuario' || (u.allowedDelegacionIds && u.allowedDelegacionIds.length > 1);
                    const isSuper = u.rol === 'superusuario';
                    const isRo = !isSuper && Boolean(u.readOnly);
                    const uCanCreate = isSuper || (!isRo && u.canCreate !== false);
                    const uCanEdit = isSuper || (!isRo && u.canEdit !== false);
                    const uCanDelete = isSuper || (!isRo && Boolean(u.canDelete));
                    const uCanReset = isSuper || (!isRo && Boolean(u.canResetCounters));

                    return (
                      <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center font-bold text-blue-600 dark:text-blue-400 text-xs shrink-0">
                              {u.nombreApellido.charAt(0)}
                            </div>
                            <div>
                              <div>{u.nombreApellido}</div>
                              {u.username === currentUser.username && (
                                <span className="text-[10px] text-blue-500 font-semibold">(Sesión Actual)</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-200">{u.username}</div>
                          <div className="text-[11px] text-slate-400">{u.email}</div>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              u.rol === 'superusuario'
                                ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                                : u.rol === 'Administrador'
                                ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-800'
                                : isRo
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                                : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                            }`}
                          >
                            <Shield className="w-3 h-3" />
                            <span>{u.rol}</span>
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{userDel?.ciudad || 'Delegación'} ({userDel?.codigo})</span>
                          </div>
                          <span className="text-[10px] text-slate-400">{userDel?.nombre}</span>
                        </td>
                        <td className="p-3.5">
                          {isRo ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              <Eye className="w-3 h-3" />
                              <span>Solo Lectura</span>
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1 max-w-[190px]">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${uCanCreate ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 line-through'}`}>
                                Carga
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${uCanEdit ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 line-through'}`}>
                                Edic.
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${uCanDelete ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 line-through'}`}>
                                Elim.
                              </span>
                              {uCanReset && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                                  Reset
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          {u.rol === 'superusuario' || (!isRo && u.canAdminModules) ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                              <FolderTree className="w-3 h-3 text-amber-500" />
                              <span>Habilitado</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-400">
                              <X className="w-3 h-3" />
                              <span>Sin Acceso</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3.5">
                          {u.rol === 'superusuario' ? (
                            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                              Acceso Global Total (Todas)
                            </span>
                          ) : hasCrossDelegation ? (
                            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                              {u.allowedDelegacionIds?.length} Delegaciones permitidas
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              Solo su propia delegación
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right space-x-1 whitespace-nowrap">
                          {perms.canEdit && (
                            <button
                              onClick={() => openEditUserModal(u)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition-colors"
                              title="Modificar usuario y permisos"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {u.rol !== 'superusuario' && perms.canDelete && (
                            <button
                              onClick={() => u.id && handleDeleteUser(u.id, u.rol, u.username)}
                              className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-lg transition-colors"
                              title="Eliminar usuario"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredUsers.length === 0 && (
              <div className="py-12 text-center text-slate-400">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-semibold">No se encontraron funcionarios con los filtros aplicados</p>
                <p className="text-xs text-slate-500 mt-1">Prueba ajustar o limpiar los criterios de búsqueda</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================= TAB 2: ROLES ======================= */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          {/* Collapsible Filter Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowRoleFilters(!showRoleFilters)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    showRoleFilters
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>{showRoleFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}</span>
                  {activeRoleFiltersCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-black">
                      {activeRoleFiltersCount}
                    </span>
                  )}
                </button>

                {activeRoleFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={handleClearRoleFilters}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Limpiar filtros</span>
                  </button>
                )}
              </div>

              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Mostrando <strong className="text-slate-900 dark:text-white">{filteredRoles.length}</strong> de <strong className="text-slate-900 dark:text-white">{roles.length}</strong> roles
              </div>
            </div>

            {showRoleFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchRole}
                    onChange={(e) => setSearchRole(e.target.value)}
                    placeholder="Buscar rol por nombre, descripción o módulo..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                {/* Role Type */}
                <div>
                  <select
                    value={filterRoleType}
                    onChange={(e) => setFilterRoleType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="TODOS">Tipo de Rol: Todos</option>
                    <option value="SISTEMA">Roles del Sistema (Base)</option>
                    <option value="PERSONALIZADO">Roles Personalizados</option>
                  </select>
                </div>

                {/* Can Delete */}
                <div>
                  <select
                    value={filterRoleCanDelete}
                    onChange={(e) => setFilterRoleCanDelete(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="TODOS">Permiso Borrado: Todos</option>
                    <option value="SI">Con permiso de borrado</option>
                    <option value="NO">Sin permiso de borrado</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRoles.map((r) => {
              const isSys = r.isSystem;
              return (
                <div
                  key={r.id || r.nombre}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-blue-400 dark:hover:border-blue-600 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-xl ${
                          isSys ? 'bg-amber-500/10 text-amber-600' : 'bg-indigo-500/10 text-indigo-600'
                        }`}>
                          <Shield className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{r.nombre}</span>
                          </h3>
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isSys
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                              : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400'
                          }`}>
                            {isSys ? 'Rol del Sistema' : 'Rol Personalizado'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {perms.canEdit && (
                          <button
                            onClick={() => openEditRoleModal(r)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors"
                            title="Editar permisos del rol"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {!isSys && perms.canDelete && (
                          <button
                            onClick={() => handleDeleteRole(r)}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors"
                            title="Eliminar rol personalizado"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 min-h-[32px]">
                      {r.descripcion || 'Sin descripción detallada.'}
                    </p>

                    {/* Permissions summary */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Modalidad de Operación:</span>
                        <span className={`font-bold ${r.readOnly ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`}>
                          {r.readOnly ? 'Solo Lectura (Consulta)' : 'Operativo'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500">Acciones:</span>
                        <div className="flex flex-wrap justify-end gap-1">
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${!r.readOnly && r.canCreate !== false ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 line-through'}`}>
                            Carga
                          </span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${!r.readOnly && r.canEdit !== false ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 line-through'}`}>
                            Editar
                          </span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${!r.readOnly && r.canDelete ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 line-through'}`}>
                            Eliminar
                          </span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${r.canExport !== false ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 line-through'}`}>
                            Exportar
                          </span>
                          {!r.readOnly && r.canResetCounters && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                              Reset
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Acceso Delegaciones:</span>
                        <span className={`font-bold ${r.allDelegacionesAccess ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}>
                          {r.allDelegacionesAccess ? 'Todas (Global)' : 'Solo Asignadas'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Administrador de Módulos:</span>
                        <span className={`font-bold ${!r.readOnly && r.canAdminModules ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'}`}>
                          {!r.readOnly && r.canAdminModules ? '✓ Habilitado' : '✕ No'}
                        </span>
                      </div>
                    </div>

                    {/* Modules chips */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Módulos Autorizados ({r.allowedModules.length} de {visibleAvailableModules.length})
                      </span>
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                        {r.allowedModules.map((mId) => {
                          const mDef = AVAILABLE_MODULES.find(m => m.id === mId);
                          return (
                            <span
                              key={mId}
                              className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                            >
                              {mDef?.label || mId}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredRoles.length === 0 && (
            <div className="py-12 text-center text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <Shield className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold">No se encontraron roles con los filtros aplicados</p>
              <p className="text-xs text-slate-500 mt-1">Prueba ajustar o limpiar los criterios de búsqueda</p>
            </div>
          )}
        </div>
      )}

      {/* ======================= MODAL: CREATE / EDIT USER ======================= */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600/10 text-blue-600 rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingUser ? 'Modificar Usuario y Permisos' : 'Crear Nuevo Usuario del Sistema'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Definición de rol, delegación asignada, permisos de borrado y módulos autorizados.
                  </p>
                </div>
              </div>
              <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {userError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{userError}</span>
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Apellido y Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    value={nombreApellido}
                    onChange={(e) => setNombreApellido(e.target.value)}
                    placeholder="ej. Gómez, Roberto Manuel"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ej. pol.delgcrim@formosa.gov.ar"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Usuario del Sistema *
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ej. r.gomez o operador.lb"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {editingUser ? 'Nueva Contraseña (opcional)' : 'Contraseña *'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required={!editingUser}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={editingUser ? 'Dejar vacío para mantener la actual' : 'Mín. 8 caracteres (letras y números)'}
                      className="w-full px-3 py-2 pr-9 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Política de seguridad: mínimo 8 caracteres con al menos una letra y un número.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Rol en el Sistema *
                  </label>
                  <select
                    value={rol}
                    onChange={(e) => handleRoleSelectionChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-bold"
                  >
                    <optgroup label="Roles del Sistema">
                      <option value="Solo Lectura">Solo Lectura (Únicamente visualización)</option>
                      <option value="Cargador de Datos">Cargador de Datos (Solo alta de registros)</option>
                      <option value="Operador">Operador (Carga y edición sin borrado)</option>
                      <option value="Perito Forense">Perito Forense (Pericias y evidencias)</option>
                      <option value="Jefe de Turno">Jefe de Turno (Supervisión y reinicio de series)</option>
                      <option value="Auditor">Auditor (Solo lectura multi-delegación)</option>
                      <option value="Administrador">Administrador (Gestión completa de Delegación)</option>
                      {currentUser.rol === 'superusuario' && (
                        <option value="superusuario">Superusuario (Acceso irrestricto total)</option>
                      )}
                    </optgroup>
                    {roles.filter(r => !SYSTEM_ROLE_NAMES.includes(r.nombre)).length > 0 && (
                      <optgroup label="Roles Personalizados">
                        {roles
                          .filter(r => !SYSTEM_ROLE_NAMES.includes(r.nombre))
                          .map((cr) => (
                            <option key={cr.id || cr.nombre} value={cr.nombre}>
                              {cr.nombre} {cr.descripcion ? `- ${cr.descripcion.slice(0, 30)}...` : ''}
                            </option>
                          ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Delegación a la que Corresponde *
                  </label>
                  <select
                    value={delegacionId}
                    onChange={(e) => setDelegacionId(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-semibold"
                  >
                    {delegaciones.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nombre} ({d.ciudad})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Permisos Granulares de Acción y Delegaciones Cruzadas */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Permisos Granulares de Operación
                </div>

                {/* Solo Lectura */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-amber-600" />
                      <span>Modo Solo Lectura</span>
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Restringe al usuario a consultar registros e informes sin poder cargar, editar ni eliminar.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rol !== 'superusuario' && readOnly}
                      disabled={rol === 'superusuario'}
                      onChange={(e) => {
                        const ro = e.target.checked;
                        setReadOnly(ro);
                        if (ro) {
                          setCanCreate(false);
                          setCanEdit(false);
                          setCanDelete(false);
                          setCanResetCounters(false);
                          setCanAdminModules(false);
                        } else {
                          setCanCreate(true);
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>

                {/* Matriz rápida de permisos: Carga / Edición / Eliminación / Exportación / Reinicio */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label className={`flex items-center justify-between p-2.5 rounded-xl border ${rol !== 'superusuario' && readOnly ? 'opacity-50' : ''} bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 cursor-pointer`}>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">Carga / Alta de Datos</span>
                      <span className="text-[10px] text-slate-500">Crear expedientes, folios, legajos</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={rol === 'superusuario' || (!readOnly && canCreate)}
                      disabled={rol === 'superusuario'}
                      onChange={(e) => {
                        setCanCreate(e.target.checked);
                        if (e.target.checked) setReadOnly(false);
                      }}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                  </label>

                  <label className={`flex items-center justify-between p-2.5 rounded-xl border ${rol !== 'superusuario' && readOnly ? 'opacity-50' : ''} bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 cursor-pointer`}>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">Edición / Modificación</span>
                      <span className="text-[10px] text-slate-500">Actualizar registros existentes</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={rol === 'superusuario' || (!readOnly && canEdit)}
                      disabled={rol === 'superusuario'}
                      onChange={(e) => {
                        setCanEdit(e.target.checked);
                        if (e.target.checked) setReadOnly(false);
                      }}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                  </label>

                  <label className={`flex items-center justify-between p-2.5 rounded-xl border ${rol !== 'superusuario' && readOnly ? 'opacity-50' : ''} bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 cursor-pointer`}>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">Eliminar Contenido</span>
                      <span className="text-[10px] text-slate-500">Borrar expedientes, folios, legajos</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={rol === 'superusuario' || (!readOnly && canDelete)}
                      disabled={rol === 'superusuario'}
                      onChange={(e) => {
                        setCanDelete(e.target.checked);
                        if (e.target.checked) setReadOnly(false);
                      }}
                      className="w-4 h-4 rounded text-emerald-600"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 cursor-pointer">
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">Exportar PDF / Reportes</span>
                      <span className="text-[10px] text-slate-500">Fichas, listados y Excel/CSV</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={rol === 'superusuario' || canExport}
                      disabled={rol === 'superusuario'}
                      onChange={(e) => setCanExport(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                  </label>

                  <label className={`flex items-center justify-between p-2.5 rounded-xl border ${rol !== 'superusuario' && readOnly ? 'opacity-50' : ''} bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 cursor-pointer sm:col-span-2`}>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">Reinicio de Series / Contadores y Depuración</span>
                      <span className="text-[10px] text-slate-500">Reiniciar ciclos de numerario o depurar registros históricos</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={rol === 'superusuario' || (!readOnly && canResetCounters)}
                      disabled={rol === 'superusuario'}
                      onChange={(e) => {
                        setCanResetCounters(e.target.checked);
                        if (e.target.checked) setReadOnly(false);
                      }}
                      className="w-4 h-4 rounded text-rose-600"
                    />
                  </label>
                </div>

                {/* Personalizar Módulos y Submódulos */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <FolderTree className="w-3.5 h-3.5 text-amber-500" />
                      <span>Personalizar Módulos y Submódulos</span>
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Permite acceder al Administrador Visual de Módulos, reordenar el menú, crear carpetas principales y configurar accesos.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rol === 'superusuario' || (!readOnly && canAdminModules)}
                      disabled={rol === 'superusuario'}
                      onChange={(e) => {
                        setCanAdminModules(e.target.checked);
                        if (e.target.checked) setReadOnly(false);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-bold text-slate-900 dark:text-white block mb-1">
                    Visualización de Otras Delegaciones:
                  </span>
                  <span className="text-[11px] text-slate-500 block mb-2">
                    Especifique qué otras delegaciones puede visualizar este usuario además de la suya propia:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {delegaciones.map((d) => {
                      const isMain = d.id === delegacionId;
                      const isAllowed = isMain || allowedDelegacionIds.includes(d.id!);
                      return (
                        <label
                          key={d.id}
                          className={`flex items-center gap-2 p-2 rounded-lg text-xs cursor-pointer ${
                            isMain ? 'bg-blue-50 dark:bg-blue-950/40 font-bold text-blue-700 dark:text-blue-300' : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isAllowed}
                            disabled={isMain || rol === 'superusuario'}
                            onChange={() => d.id && handleToggleDelegacionAccess(d.id)}
                            className="rounded border-slate-300 text-blue-600"
                          />
                          <span>{d.nombre}</span>
                          {isMain && <span className="text-[9px] text-blue-500 uppercase">(Principal)</span>}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Módulos Habilitados */}
              <div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Módulos Habilitados para este Usuario ({allowedModules.length} seleccionados):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs max-h-48 overflow-y-auto p-1">
                  {visibleAvailableModules.map((m) => {
                    const isChecked = allowedModules.includes(m.id);
                    const isAuditRestricted = m.id === 'auditoria' && rol !== 'superusuario';
                    return (
                      <label
                        key={m.id}
                        className={`flex items-center gap-2 p-2 rounded-xl border transition-colors ${
                          isAuditRestricted
                            ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-400'
                            : isChecked
                            ? 'cursor-pointer bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200 font-semibold'
                            : 'cursor-pointer bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={!isAuditRestricted && isChecked}
                          disabled={isAuditRestricted}
                          onChange={() => handleToggleUserModule(m.id)}
                          className="rounded border-slate-300 text-blue-600"
                        />
                        <span className="truncate">{m.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all active:scale-95"
                >
                  {editingUser ? 'Guardar Cambios' : 'Registrar Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================= MODAL: CREATE / EDIT ROLE ======================= */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600/10 text-indigo-600 rounded-xl">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingRole ? `Modificar Rol: ${editingRole.nombre}` : 'Crear Nuevo Rol Personalizado'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Define la jerarquía de permisos, accesos y módulos autorizados para este perfil operativo.
                  </p>
                </div>
              </div>
              <button onClick={() => setIsRoleModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {roleError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{roleError}</span>
              </div>
            )}

            <form onSubmit={handleSaveRole} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nombre del Rol *
                  </label>
                  <input
                    type="text"
                    required
                    value={roleNombre}
                    onChange={(e) => setRoleNombre(e.target.value)}
                    placeholder="ej. Perito Balístico, Oficial de Guardia"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Descripción del Perfil
                  </label>
                  <input
                    type="text"
                    value={roleDescripcion}
                    onChange={(e) => setRoleDescripcion(e.target.value)}
                    placeholder="ej. Acceso a evidencias periciales y causas judiciales"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Toggles de Permisos Especiales */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Permisos Granulares del Perfil
                </div>

                {/* Solo Lectura */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-amber-600" />
                      <span>Modo Solo Lectura</span>
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Deshabilita carga, edición, eliminación y reinicios para usuarios de este rol.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={roleReadOnly}
                      disabled={roleNombre === 'superusuario'}
                      onChange={(e) => {
                        const ro = e.target.checked;
                        setRoleReadOnly(ro);
                        if (ro) {
                          setRoleCanCreate(false);
                          setRoleCanEdit(false);
                          setRoleCanDelete(false);
                          setRoleCanResetCounters(false);
                          setRoleCanAdminModules(false);
                        } else {
                          setRoleCanCreate(true);
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label className={`flex items-center justify-between p-2.5 rounded-xl border ${roleReadOnly ? 'opacity-50' : ''} bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 cursor-pointer`}>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">Carga / Alta</span>
                      <span className="text-[10px] text-slate-500">Permite crear nuevos registros</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={!roleReadOnly && roleCanCreate}
                      disabled={roleNombre === 'superusuario'}
                      onChange={(e) => {
                        setRoleCanCreate(e.target.checked);
                        if (e.target.checked) setRoleReadOnly(false);
                      }}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                  </label>

                  <label className={`flex items-center justify-between p-2.5 rounded-xl border ${roleReadOnly ? 'opacity-50' : ''} bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 cursor-pointer`}>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">Edición / Modificar</span>
                      <span className="text-[10px] text-slate-500">Permite editar registros existentes</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={!roleReadOnly && roleCanEdit}
                      disabled={roleNombre === 'superusuario'}
                      onChange={(e) => {
                        setRoleCanEdit(e.target.checked);
                        if (e.target.checked) setRoleReadOnly(false);
                      }}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                  </label>

                  <label className={`flex items-center justify-between p-2.5 rounded-xl border ${roleReadOnly ? 'opacity-50' : ''} bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 cursor-pointer`}>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">Eliminar Registros</span>
                      <span className="text-[10px] text-slate-500">Permite borrar registros del sistema</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={!roleReadOnly && roleCanDelete}
                      disabled={roleNombre === 'superusuario'}
                      onChange={(e) => {
                        setRoleCanDelete(e.target.checked);
                        if (e.target.checked) setRoleReadOnly(false);
                      }}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 cursor-pointer">
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">Exportar PDF / Reportes</span>
                      <span className="text-[10px] text-slate-500">Fichas, reportes y Excel/CSV</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={roleCanExport}
                      disabled={roleNombre === 'superusuario'}
                      onChange={(e) => setRoleCanExport(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                  </label>

                  <label className={`flex items-center justify-between p-2.5 rounded-xl border ${roleReadOnly ? 'opacity-50' : ''} bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 cursor-pointer sm:col-span-2`}>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">Reinicio de Series / Contadores y Depuración</span>
                      <span className="text-[10px] text-slate-500">Habilita reinicio de numerario o depuración de períodos</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={!roleReadOnly && roleCanResetCounters}
                      disabled={roleNombre === 'superusuario'}
                      onChange={(e) => {
                        setRoleCanResetCounters(e.target.checked);
                        if (e.target.checked) setRoleReadOnly(false);
                      }}
                      className="w-4 h-4 rounded text-rose-600"
                    />
                  </label>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Acceso Global a Todas las Delegaciones
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Si se activa, los usuarios de este rol podrán ver los registros de todas las delegaciones de la provincia.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={roleAllDelegaciones}
                      onChange={(e) => setRoleAllDelegaciones(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Administrador de Módulos del Sistema
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Habilita la reordenación de módulos y conversión en submódulos desde el panel principal.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!roleReadOnly && roleCanAdminModules}
                      disabled={roleNombre === 'superusuario'}
                      onChange={(e) => {
                        setRoleCanAdminModules(e.target.checked);
                        if (e.target.checked) setRoleReadOnly(false);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>

              {/* Matriz de Módulos Autorizados */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Módulos Autorizados para este Rol ({roleAllowedModules.length} seleccionados):
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllRoleModules}
                      className="text-[11px] font-bold text-indigo-600 hover:underline"
                    >
                      Marcar Todos
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={handleDeselectAllRoleModules}
                      className="text-[11px] font-bold text-slate-500 hover:underline"
                    >
                      Deseleccionar
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs max-h-56 overflow-y-auto p-1">
                  {visibleAvailableModules.map((m) => {
                    const isChecked = roleAllowedModules.includes(m.id);
                    const isAuditRestricted = m.id === 'auditoria' && roleNombre !== 'superusuario';
                    return (
                      <label
                        key={m.id}
                        className={`flex items-center gap-2 p-2 rounded-xl border transition-colors ${
                          isAuditRestricted
                            ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-400'
                            : isChecked
                            ? 'cursor-pointer bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900 text-indigo-900 dark:text-indigo-200 font-semibold'
                            : 'cursor-pointer bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={!isAuditRestricted && isChecked}
                          disabled={isAuditRestricted}
                          onChange={() => handleToggleRoleModule(m.id)}
                          className="rounded border-slate-300 text-indigo-600"
                        />
                        <span className="truncate">{m.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all active:scale-95"
                >
                  {editingRole ? 'Guardar Cambios de Rol' : 'Crear Rol Personalizado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteUserConfirm)}
        onClose={() => setDeleteUserConfirm(null)}
        onConfirm={executeDeleteUser}
        title="Confirmar Eliminación de Usuario"
        message={`¿Confirma que desea eliminar al usuario "${deleteUserConfirm?.username || ''}" del sistema? Sus sesiones activas serán revocadas inmediatamente.`}
        confirmText="Eliminar Usuario"
        danger={true}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteRoleConfirm)}
        onClose={() => setDeleteRoleConfirm(null)}
        onConfirm={executeDeleteRole}
        title="Confirmar Eliminación de Rol"
        message={`¿Confirma que desea eliminar el rol "${deleteRoleConfirm?.nombre || ''}"? Los usuarios asignados a este rol deberán ser reasignados.`}
        confirmText="Eliminar Rol"
        danger={true}
      />
    </div>
  );
};
