import React, { useState, useEffect } from 'react';
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
  SlidersHorizontal
} from 'lucide-react';
import { SisPolUser, SisPolDelegacion, UserRole } from '../../types/sgp';
import { sgpManager } from '../../db/dexieDb';

const AVAILABLE_MODULES = [
  { id: 'dashboard', label: 'Dashboard Ejecutivo' },
  { id: 'expedientes', label: 'Expedientes & Evidencias' },
  { id: 'numerario', label: 'Numerario & Control de Folios' },
  { id: 'ppi', label: 'Causas PPI (Policial)' },
  { id: 'personas', label: 'Personas (Evidencias)' },
  { id: 'personal', label: 'Personal & Legajos' },
  { id: 'licencias', label: 'Licencias & Cuatrienio' },
  { id: 'moviles', label: 'Parque Automotor' },
  { id: 'recargos', label: 'Recargos de Servicio' },
  { id: 'charlas', label: 'Charlas y Prevención' },
  { id: 'membrete', label: 'Membrete Oficial' },
  { id: 'catalogos', label: 'Catálogos Dinámicos' },
  { id: 'respaldos', label: 'Copia Completa & Backup' },
  { id: 'usuarios', label: 'Gestión de Usuarios y Roles' },
  { id: 'modulos', label: 'Administrador de Módulos' }
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
  const [users, setUsers] = useState<SisPolUser[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SisPolUser | null>(null);

  // Form State
  const [nombreApellido, setNombreApellido] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<UserRole>('Operador');
  const [delegacionId, setDelegacionId] = useState<number>(delegaciones[0]?.id || 1);
  const [canDelete, setCanDelete] = useState<boolean>(false);
  const [allowedDelegacionIds, setAllowedDelegacionIds] = useState<number[]>([delegaciones[0]?.id || 1]);
  const [allowedModules, setAllowedModules] = useState<string[]>([
    'dashboard',
    'expedientes',
    'ppi',
    'personas',
    'personal',
    'licencias',
    'moviles',
    'recargos',
    'charlas'
  ]);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    const list = await sgpManager.getUsers();
    setUsers(list);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    setNombreApellido('');
    setEmail('');
    setUsername('');
    setPassword('');
    setRol('Operador');
    setDelegacionId(currentUser.delegacionId || delegaciones[0]?.id || 1);
    setCanDelete(false);
    setAllowedDelegacionIds([currentUser.delegacionId || 1]);
    setAllowedModules([
      'dashboard',
      'expedientes',
      'ppi',
      'personas',
      'personal',
      'licencias',
      'moviles',
      'recargos',
      'charlas'
    ]);
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (u: SisPolUser) => {
    setEditingUser(u);
    setNombreApellido(u.nombreApellido);
    setEmail(u.email);
    setUsername(u.username);
    setPassword(u.password);
    setRol(u.rol);
    setDelegacionId(u.delegacionId);
    setCanDelete(u.canDelete);
    setAllowedDelegacionIds(u.allowedDelegacionIds || [u.delegacionId]);
    setAllowedModules(u.allowedModules || AVAILABLE_MODULES.map(m => m.id));
    setError(null);
    setIsModalOpen(true);
  };

  const handleToggleModule = (modId: string) => {
    setAllowedModules(prev =>
      prev.includes(modId) ? prev.filter(m => m !== modId) : [...prev, modId]
    );
  };

  const handleToggleDelegacionAccess = (dId: number) => {
    setAllowedDelegacionIds(prev =>
      prev.includes(dId) ? (prev.length > 1 ? prev.filter(id => id !== dId) : prev) : [...prev, dId]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nombreApellido.trim() || !email.trim() || !username.trim() || !password.trim()) {
      setError('Todos los campos son requeridos: Apellido y Nombre, Correo, Usuario y Contraseña.');
      return;
    }

    try {
      // Ensure the user's primary delegation is included in allowedDelegacionIds
      const finalAllowedDelegaciones = Array.from(new Set([...allowedDelegacionIds, delegacionId]));

      const userData: SisPolUser = {
        nombreApellido: nombreApellido.trim(),
        email: email.trim(),
        username: username.trim(),
        password: password.trim(),
        rol,
        delegacionId,
        canDelete: rol === 'superusuario' ? true : canDelete,
        allowedModules,
        allowedDelegacionIds: rol === 'superusuario' ? delegaciones.map(d => d.id!) : finalAllowedDelegaciones,
        canAdminModules: rol === 'superusuario'
      };

      if (editingUser && editingUser.id) {
        await sgpManager.updateUser(editingUser.id, userData);
      } else {
        await sgpManager.addUser(userData);
      }

      await loadUsers();
      onRefresh();
      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al guardar el usuario.');
    }
  };

  const handleDeleteUser = async (id: number, uRole: UserRole) => {
    if (uRole === 'superusuario') {
      alert('No es posible eliminar al Superusuario del sistema.');
      return;
    }
    if (!confirm('¿Confirma que desea eliminar este usuario del sistema?')) return;
    await sgpManager.deleteUser(id);
    await loadUsers();
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 text-blue-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Gestión de Usuarios, Roles y Delegaciones
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Administración de cuentas con control de permisos por módulo, delegación asignada y borrado de registros.
            </p>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nuevo Usuario</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5">Funcionario / Nombre</th>
                <th className="p-3.5">Usuario / Correo</th>
                <th className="p-3.5">Rol Policial</th>
                <th className="p-3.5">Delegación Asignada</th>
                <th className="p-3.5 text-center">Permiso Borrar</th>
                <th className="p-3.5">Otras Delegaciones</th>
                <th className="p-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map((u) => {
                const userDel = delegaciones.find(d => d.id === u.delegacionId);
                const hasCrossDelegation = u.rol === 'superusuario' || (u.allowedDelegacionIds && u.allowedDelegacionIds.length > 1);

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
                    <td className="p-3.5 text-center">
                      {u.canDelete || u.rol === 'superusuario' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                          <Check className="w-3 h-3" />
                          <span>Habilitado</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-400">
                          <X className="w-3 h-3" />
                          <span>No Autorizado</span>
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
                      <button
                        onClick={() => openEditModal(u)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition-colors"
                        title="Modificar usuario y permisos"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {u.rol !== 'superusuario' && (
                        <button
                          onClick={() => u.id && handleDeleteUser(u.id, u.rol)}
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
      </div>

      {/* Create / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8">
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
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
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
                    Contraseña *
                  </label>
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Clave de acceso"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Rol en el Sistema *
                  </label>
                  <select
                    value={rol}
                    onChange={(e) => setRol(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-bold"
                  >
                    <option value="Operador">Operador (Carga de datos y consultas)</option>
                    <option value="Administrador">Administrador (Gestión completa de su Delegación)</option>
                    <option value="superusuario">Superusuario (Acceso irrestricto total)</option>
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

              {/* Permisos de Borrado y Delegaciones Cruzadas */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Permiso para Eliminar Contenido
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Si está deshabilitado, el usuario no podrá borrar expedientes, personas ni registros policiales.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canDelete || rol === 'superusuario'}
                      disabled={rol === 'superusuario'}
                      onChange={(e) => setCanDelete(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
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
                  Módulos Habilitados para este Usuario:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {AVAILABLE_MODULES.map((m) => {
                    const isChecked = allowedModules.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200 font-semibold'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleModule(m.id)}
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
                  onClick={() => setIsModalOpen(false)}
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
    </div>
  );
};
