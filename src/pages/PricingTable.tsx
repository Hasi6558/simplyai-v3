
import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { SubscriptionPlan } from '@/types/supabase';

interface Plan extends SubscriptionPlan {
  button_variant: 'outline' | 'default';
}

const PricingTable = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data, error } = await supabase
          .from('subscription_plans')
          .select('*')
          .order('sort_order', { ascending: true })
          .eq('active', true);

        if (error) throw error;
        
        if (data) {
          // Transform the features from Json to string[] and ensure button_variant is correct type
          const transformedPlans = data.map(plan => ({
            ...plan,
            features: Array.isArray(plan.features) ? plan.features : JSON.parse(plan.features as string || '[]'),
            button_variant: (plan.button_variant === 'outline' || plan.button_variant === 'default') 
              ? plan.button_variant as 'outline' | 'default'
              : 'outline' as const,
            is_free: Boolean(plan.is_free) // Ensure is_free property exists and is boolean
          }));
          
          setPlans(transformedPlans);
        }
      } catch (error) {
        console.error('Error fetching plans:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const handlePlanSelection = (plan: SubscriptionPlan) => {
    // If the user is logged in, navigate to dashboard for free plans or payment for paid plans
    if (user) {
      if (plan.is_free) {
        return `/dashboard?plan=${plan.id}`;
      } else {
        return `/payment?plan=${plan.id}&price=${plan.price}`;
      }
    }
    
    // If the user is not logged in, navigate to registration with plan parameters
    return `/register?plan=${plan.id}&price=${plan.price}`;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-2 rounded-3xl animate-pulse">
            <CardHeader className="pt-6">
              <div className="h-6 bg-gray-200 rounded w-24 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-32"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-4 bg-gray-200 rounded"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
      {plans.map((plan) => (
        <Card 
          key={plan.id} 
          className={`border-2 rounded-3xl card-hover ${
            plan.is_popular ? 'border-purple-500 shadow-md' : 'border-border'
          } ${plan.is_free ? 'border-green-400' : ''}`}
        >
          {plan.is_popular && (
            <div className="bg-purple-600 text-white text-center py-2 rounded-t-[1.4rem] text-sm font-medium">
              Più popolare
            </div>
          )}
          {plan.is_free && !plan.is_popular && (
            <div className="bg-green-600 text-white text-center py-2 rounded-t-[1.4rem] text-sm font-medium">
              Gratuito
            </div>
          )}
          <CardHeader className={plan.is_popular || plan.is_free ? 'pt-4' : 'pt-6'}>
            <CardTitle className="text-xl">{plan.name}</CardTitle>
            <div className="flex items-baseline mt-3">
              {plan.is_free ? (
                <span className="text-3xl font-bold">Gratuito</span>
              ) : (
                <>
                  <span className="text-3xl font-bold">€{(plan.price / 100).toFixed(0)}</span>
                  <span className="ml-1 text-sm text-muted-foreground">/{plan.interval}</span>
                </>
              )}
            </div>
            <CardDescription className="mt-2">{plan.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <div className="mr-2 mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-purple-100">
                    <Check className="h-3.5 w-3.5 text-purple-600" />
                  </div>
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Link to={handlePlanSelection(plan)} className="w-full">
              <Button 
                variant={plan.button_variant as 'outline' | 'default'} 
                className={`w-full rounded-full ${
                  plan.is_popular ? 'bg-purple-600 hover:bg-purple-700' : ''
                } ${
                  plan.is_free ? 'bg-green-600 hover:bg-green-700' : ''
                }`}
              >
                {plan.button_text || (plan.is_free ? 'Inizia Gratis' : 'Seleziona Piano')}
              </Button>
            </Link>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};

export default PricingTable;
