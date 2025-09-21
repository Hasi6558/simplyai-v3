
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, KeyRound } from 'lucide-react';

const profileSchema = z.object({
  firstName: z.string().min(2, 'Il nome deve contenere almeno 2 caratteri'),
  lastName: z.string().min(2, 'Il cognome deve contenere almeno 2 caratteri'),
  email: z.string().email('Inserisci un indirizzo email valido').optional(),
});

const passwordSchema = z.object({
  password: z.string().min(6, 'La password deve contenere almeno 6 caratteri'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Le password non coincidono",
  path: ["confirmPassword"],
});

export const UserProfile = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  
  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: user?.email || '',
    },
  });
  
  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        
        // In una implementazione reale, recupereremmo questi dati da una tabella profiles
        // Per ora, proviamo a estrarli dai metadati dell'utente se disponibili
        const { data: { user: userData } } = await supabase.auth.getUser();
        
        if (userData?.user_metadata) {
          form.setValue('firstName', userData.user_metadata.first_name || '');
          form.setValue('lastName', userData.user_metadata.last_name || '');
        }
      } catch (error) {
        console.error('Errore nel caricamento del profilo:', error);
        toast({
          variant: 'destructive',
          title: 'Errore',
          description: 'Non è stato possibile caricare i dati del profilo',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUserProfile();
  }, [user, form, toast]);
  
  const onSubmit = async (values: z.infer<typeof profileSchema>) => {
    try {
      setIsLoading(true);
      
      await supabase.auth.updateUser({
        data: {
          first_name: values.firstName,
          last_name: values.lastName,
        },
      });
      
      toast({
        title: 'Profilo aggiornato',
        description: 'Le informazioni del profilo sono state aggiornate con successo',
      });
    } catch (error) {
      console.error('Errore nell\'aggiornamento del profilo:', error);
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Non è stato possibile aggiornare il profilo',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onPasswordSubmit = async (values: z.infer<typeof passwordSchema>) => {
    try {
      setIsPasswordLoading(true);
      
      const { error } = await supabase.auth.updateUser({
        password: values.password
      });

      if (error) throw error;
      
      toast({
        title: 'Password aggiornata',
        description: 'La tua password è stata aggiornata con successo',
      });
      
      passwordForm.reset();
    } catch (error) {
      console.error('Errore nell\'aggiornamento della password:', error);
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Non è stato possibile aggiornare la password',
      });
    } finally {
      setIsPasswordLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profilo Utente</CardTitle>
          <CardDescription>
            Gestisci le informazioni del tuo profilo
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input placeholder="Inserisci il tuo nome" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cognome</FormLabel>
                        <FormControl>
                          <Input placeholder="Inserisci il tuo cognome" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" disabled {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" disabled={isLoading} className="w-full mt-4">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvataggio...
                    </>
                  ) : (
                    'Salva Modifiche'
                  )}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Cambio Password
          </CardTitle>
          <CardDescription>
            Modifica la tua password di accesso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nuova Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Inserisci la nuova password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conferma Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Conferma la nuova password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isPasswordLoading} className="w-full">
                {isPasswordLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Aggiornamento Password...
                  </>
                ) : (
                  'Aggiorna Password'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};
