
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Badge } from "@/components/ui/badge";
import { UserPlus, User, UsersRound, Loader2 } from 'lucide-react';
import { fetchAllUsers, deleteUser, updateUserRole, AdminUser, createUser, CreateUserData, getAllUsersQuestionnaireProgress, QuestionnaireProgress } from '@/services/adminService';

const AdminUserManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [questionnaireProgress, setQuestionnaireProgress] = useState<Record<string, QuestionnaireProgress>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchKey, setSearchKey] = useState(0); // Force re-render key
  const [selectedUserForRole, setSelectedUserForRole] = useState<AdminUser | null>(null);
  const [selectedUserForDelete, setSelectedUserForDelete] = useState<AdminUser | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [newUserData, setNewUserData] = useState<CreateUserData>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'user'
  });

  // Load users on component mount
  useEffect(() => {
    loadUsers();
  }, []);

  // Debug search state changes
  useEffect(() => {
    console.log('Search state changed:', search);
  }, [search]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch users first
      const dbUsers = await fetchAllUsers();
      
      // Try to fetch progress data, but don't fail if it's not available
      let progressData = {};
      try {
        progressData = await getAllUsersQuestionnaireProgress();
      } catch (progressError) {
        console.warn('Could not load questionnaire progress data:', progressError);
        toast({
          title: "Avviso",
          description: "Dati di progresso questionari non disponibili.",
          variant: "default"
        });
      }
      
      // Merge users with their questionnaire progress
      const usersWithProgress = dbUsers.map(user => ({
        ...user,
        planStatus: progressData[user.id] || {
          totalQuestionnaires: 0,
          completedQuestionnaires: 0,
          percentage: 0
        }
      }));
      
      setUsers(usersWithProgress);
      setQuestionnaireProgress(progressData);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare gli utenti.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const searchLower = search.toLowerCase();
    const fullName = user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim();
    
    return user.email.toLowerCase().includes(searchLower) ||
           user.role.toLowerCase().includes(searchLower) ||
           fullName.toLowerCase().includes(searchLower);
  });

  const handleRoleChange = async () => {
    if (selectedUserForRole && newRole) {
      try {
        await updateUserRole(selectedUserForRole.id, newRole);
        
        // Update local state
        const updatedUsers = users.map(user => 
          user.id === selectedUserForRole.id ? { ...user, role: newRole } : user
        );
        setUsers(updatedUsers);
        
        toast({
          title: "Ruolo aggiornato",
          description: `Il ruolo di ${selectedUserForRole.email} è stato cambiato in ${newRole}.`
        });
        
        setRoleDialogOpen(false);
        setSelectedUserForRole(null);
        setNewRole('');
      } catch (error) {
        console.error('Error updating role:', error);
        toast({
          title: "Errore",
          description: "Impossibile aggiornare il ruolo dell'utente.",
          variant: "destructive"
        });
      }
    }
  };

  const handleDeleteUser = async () => {
    if (selectedUserForDelete) {
      try {
        await deleteUser(selectedUserForDelete.id);
        
        // Update local state
        const updatedUsers = users.filter(user => user.id !== selectedUserForDelete.id);
        setUsers(updatedUsers);
        
        toast({
          title: "Utente eliminato",
          description: `${selectedUserForDelete.email} è stato eliminato con successo.`
        });
        
        setDeleteDialogOpen(false);
        setSelectedUserForDelete(null);
      } catch (error) {
        console.error('Error deleting user:', error);
        toast({
          title: "Errore",
          description: "Impossibile eliminare l'utente.",
          variant: "destructive"
        });
      }
    }
  };

  const handleCreateUser = async () => {
    try {
      if (!newUserData.email || !newUserData.password || !newUserData.firstName || !newUserData.lastName) {
        toast({
          title: "Errore",
          description: "Tutti i campi sono obbligatori.",
          variant: "destructive"
        });
        return;
      }

      const createdUser = await createUser(newUserData);
      
      // Update local state
      setUsers([...users, createdUser]);
      
      // Clear search with multiple approaches to ensure it works
      setSearch('');
      setSearchKey(prev => prev + 1); // Force re-render
      
      // Also clear the input directly
      if (searchInputRef.current) {
        searchInputRef.current.value = '';
      }
      
      toast({
        title: "Utente creato",
        description: `${createdUser.email} è stato creato con successo.`
      });
      
      setCreateUserDialogOpen(false);
      setNewUserData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        role: 'user'
      });
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "Errore",
        description: "Impossibile creare l'utente.",
        variant: "destructive"
      });
    }
  };

  const goToUserDetails = (userId: string) => {
    navigate(`/admin/users/${userId}`);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'administrator':
        return 'bg-red-100 text-red-800';
      case 'premium_user':
        return 'bg-purple-100 text-purple-800';
      case 'user':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'administrator':
        return 'Amministratore';
      case 'premium_user':
        return 'Utente Premium';
      case 'user':
        return 'Utente';
      default:
        return role;
    }
  };

  const renderPlanStatus = (planStatus?: QuestionnaireProgress) => {
    if (!planStatus || planStatus.totalQuestionnaires === 0) {
      return (
        <div className="text-center">
          <span className="text-gray-500 text-sm">Nessun piano</span>
        </div>
      );
    }

    const { completedQuestionnaires, totalQuestionnaires, percentage, planName } = planStatus;
    
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">{completedQuestionnaires}/{totalQuestionnaires}</span>
          <span className="font-medium">{percentage.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              percentage === 100 ? 'bg-green-500' : 
              percentage >= 50 ? 'bg-blue-500' : 
              percentage > 0 ? 'bg-yellow-500' : 'bg-gray-300'
            }`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        {planName && (
          <div className="text-xs text-gray-500 truncate" title={planName}>
            {planName}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Caricamento utenti...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Gestione Utenti</h1>
          <p className="text-muted-foreground">Gestisci gli utenti della piattaforma</p>
        </div>
        <Dialog open={createUserDialogOpen} onOpenChange={setCreateUserDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <UserPlus className="h-4 w-4 mr-2" />
              Aggiungi Utente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Crea Nuovo Utente</DialogTitle>
              <DialogDescription>
                Inserisci i dettagli del nuovo utente. Tutti i campi sono obbligatori.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="newUserFirstName" className="text-right">
                  Nome
                </label>
                <Input
                  id="newUserFirstName"
                  value={newUserData.firstName}
                  onChange={(e) => setNewUserData({...newUserData, firstName: e.target.value})}
                  className="col-span-3"
                  placeholder="Nome"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="newUserLastName" className="text-right">
                  Cognome
                </label>
                <Input
                  id="newUserLastName"
                  value={newUserData.lastName}
                  onChange={(e) => setNewUserData({...newUserData, lastName: e.target.value})}
                  className="col-span-3"
                  placeholder="Cognome"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="newUserEmail" className="text-right">
                  Email
                </label>
                <Input
                  id="newUserEmail"
                  type="email"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                  className="col-span-3"
                  placeholder="email@esempio.com"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="newUserPassword" className="text-right">
                  Password
                </label>
                <Input
                  id="newUserPassword"
                  type="password"
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({...newUserData, password: e.target.value})}
                  className="col-span-3"
                  placeholder="Password"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="newUserRole" className="text-right">
                  Ruolo
                </label>
                <Select 
                  value={newUserData.role} 
                  onValueChange={(value) => setNewUserData({...newUserData, role: value as 'user' | 'premium_user' | 'administrator'})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Seleziona ruolo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Utente</SelectItem>
                    <SelectItem value="premium_user">Utente Premium</SelectItem>
                    <SelectItem value="administrator">Amministratore</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateUserDialogOpen(false)}>
                Annulla
              </Button>
              <Button onClick={handleCreateUser} className="bg-purple-600 hover:bg-purple-700">
                Crea Utente
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6">
        <Input 
          key={searchKey}
          ref={searchInputRef}
          placeholder="Cerca utenti per email o ruolo..." 
          value={search || ''} 
          onChange={(e) => {
            console.log('Search input changed:', e.target.value);
            setSearch(e.target.value);
          }}
          className="max-w-md"
          type="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
        />
      </div>

      {/* Table container with border and horizontal scroll */}
      <div className="border border-gray-200 rounded-lg shadow-sm bg-white overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <Table className="min-w-full">
            <TableCaption className="py-4 text-gray-500">Lista degli utenti registrati</TableCaption>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold text-gray-700 min-w-[120px]">Nome</TableHead>
                <TableHead className="font-semibold text-gray-700 min-w-[200px]">Email</TableHead>
                <TableHead className="font-semibold text-gray-700 min-w-[80px]">Stato</TableHead>
                <TableHead className="font-semibold text-gray-700 min-w-[120px]">Ruolo</TableHead>
                <TableHead className="font-semibold text-gray-700 min-w-[180px]">Stato Piano</TableHead>
                <TableHead className="font-semibold text-gray-700 min-w-[140px]">Data Registrazione</TableHead>
                <TableHead className="font-semibold text-gray-700 min-w-[140px]">Ultima Attività</TableHead>
                <TableHead className="font-semibold text-gray-700 text-right min-w-[200px]">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <TableRow key={user.id} className="hover:bg-gray-50 transition-colors">
                <TableCell className="font-medium">
                  {user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'N/A'}
                </TableCell>
                <TableCell className="text-gray-600">{user.email}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.last_login ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {user.last_login ? 'Attivo' : 'Inattivo'}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge className={getRoleBadgeColor(user.role)}>
                    {user.role === 'administrator' ? (
                      <><UsersRound className="h-3 w-3 mr-1" /> {getRoleDisplayName(user.role)}</>
                    ) : user.role === 'premium_user' ? (
                      <><User className="h-3 w-3 mr-1" /> {getRoleDisplayName(user.role)}</>
                    ) : (
                      <>{getRoleDisplayName(user.role)}</>
                    )}
                  </Badge>
                </TableCell>
                <TableCell className="min-w-[150px]">
                  {renderPlanStatus(user.planStatus)}
                </TableCell>
                <TableCell>{new Date(user.created_at).toLocaleDateString('it-IT')}</TableCell>
                <TableCell>{user.last_login ? new Date(user.last_login).toLocaleDateString('it-IT') : 'Mai'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => goToUserDetails(user.id)}
                      className="whitespace-nowrap"
                    >
                      Dettagli
                    </Button>
                    <Dialog open={roleDialogOpen && selectedUserForRole?.id === user.id} onOpenChange={setRoleDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedUserForRole(user);
                            setNewRole(user.role);
                          }}
                          className="whitespace-nowrap"
                        >
                          Cambia Ruolo
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Cambia Ruolo Utente</DialogTitle>
                          <DialogDescription>
                            Seleziona il nuovo ruolo per {user.email}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                          <Select value={newRole} onValueChange={setNewRole}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona un ruolo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">Utente</SelectItem>
                              <SelectItem value="premium_user">Utente Premium</SelectItem>
                              <SelectItem value="administrator">Amministratore</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
                            Annulla
                          </Button>
                          <Button onClick={handleRoleChange}>
                            Aggiorna Ruolo
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    
                    <Dialog open={deleteDialogOpen && selectedUserForDelete?.id === user.id} onOpenChange={setDeleteDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => setSelectedUserForDelete(user)}
                          className="whitespace-nowrap"
                        >
                          Elimina
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Conferma Eliminazione</DialogTitle>
                          <DialogDescription>
                            Sei sicuro di voler eliminare l'utente {selectedUserForDelete?.email}?
                            Questa azione non può essere annullata.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setDeleteDialogOpen(false)}
                          >
                            Annulla
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={handleDeleteUser}
                          >
                            Elimina
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                Nessun utente trovato
              </TableCell>
            </TableRow>
          )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default AdminUserManagement;
