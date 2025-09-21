import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import PricingTable from "@/components/PricingTable";
import { fetchAllPlans } from "@/services/plansService";
import { Loader2 } from "lucide-react";
import { savePageData } from "@/services/pagesService";

const Pricing = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [googleData, setGoogleData] = useState(null);
  const [isGoogleSignup, setIsGoogleSignup] = useState(false);
  const [facebookData, setFacebookData] = useState(null);
  const [isFacebookSignup, setIsFacebookSignup] = useState(false);
  const [userSelectedPlanId, setUserSelectedPlanId] = useState(null);
  const [isEmailPasswordUser, setIsEmailPasswordUser] = useState(false);
  const [tempUserData, setTempUserData] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const savePageDataDB = async () => {
      const data = document.getElementById("pricingJSX");
      console.log(data);
      const response = await savePageData({
        id: "pricing",
        title: "Prezzi",
        content: data.innerHTML,
      });
    };
    savePageDataDB();
  }, []);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const data = await fetchAllPlans();
        setPlans(data || []);
      } catch (error) {
        console.error("Error fetching plans:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Check for OAuth data in URL parameters
    const urlParams = new URLSearchParams(location.search);

    // Check for Google OAuth data
    const googleSignup = urlParams.get("google_signup");
    const googleDataParam = urlParams.get("google_data");

    if (googleSignup === "true" && googleDataParam) {
      try {
        const parsedGoogleData = JSON.parse(
          decodeURIComponent(googleDataParam)
        );
        setGoogleData(parsedGoogleData);
        setIsGoogleSignup(true);
      } catch (error) {
        console.error("Error parsing Google data:", error);
      }
    }

    // Check for Facebook OAuth data
    const facebookSignup = urlParams.get("facebook_signup");
    const facebookDataParam = urlParams.get("facebook_data");

    if (facebookSignup === "true" && facebookDataParam) {
      try {
        const parsedFacebookData = JSON.parse(
          decodeURIComponent(facebookDataParam)
        );
        setFacebookData(parsedFacebookData);
        setIsFacebookSignup(true);
      } catch (error) {
        console.error("Error parsing Facebook data:", error);
      }
    }

    // Check for email/password user with pre-selected plan
    const userSelectedPlan = localStorage.getItem("user_selected_plan_id");
    if (userSelectedPlan && !isGoogleSignup && !isFacebookSignup) {
      console.log(
        "💾 Detected email/password user with pre-selected plan:",
        userSelectedPlan
      );
      setUserSelectedPlanId(userSelectedPlan);
      setIsEmailPasswordUser(true);
    }

    // Check for temporary user data from normal registration
    const tempUserDataStr = localStorage.getItem("temp_user_data");
    if (tempUserDataStr && !isGoogleSignup && !isFacebookSignup) {
      try {
        const parsedTempData = JSON.parse(tempUserDataStr);
        setTempUserData(parsedTempData);
        setIsEmailPasswordUser(true);
        console.log(
          "📝 Detected temporary user data from registration:",
          parsedTempData.email
        );
      } catch (error) {
        console.error("Error parsing temp user data:", error);
      }
    }
    fetchPlans();
  }, [location.search]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div
        className="flex-grow py-16 px-4 bg-gradient-to-b from-white to-[var(--color-primary-50)]"
        id="pricingJSX"
      >
        <div className="max-w-7xl mx-auto">
          {false ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-[var(--color-primary-600)]" />
            </div>
          ) : (
            <>
              <div className="text-center mb-16">
                <h1 className="text-4xl font-bold mb-4">
                  {isGoogleSignup || isFacebookSignup
                    ? "Complete Your Registration"
                    : isEmailPasswordUser && tempUserData
                    ? `Benvenuto ${tempUserData.firstName}! Seleziona il tuo piano`
                    : isEmailPasswordUser
                    ? "Conferma il tuo piano"
                    : "Scegli il piano più adatto a te"}
                </h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  {isGoogleSignup
                    ? `Welcome ${googleData?.firstName}! Please select a plan to complete your registration.`
                    : isFacebookSignup
                    ? `Welcome ${facebookData?.firstName}! Please select a plan to complete your registration.`
                    : isEmailPasswordUser && tempUserData
                    ? "Seleziona un piano per completare la tua registrazione. Il tuo account verrà creato dopo la selezione del piano."
                    : isEmailPasswordUser
                    ? "Conferma il piano selezionato durante la registrazione o scegline uno diverso."
                    : "Offriamo diverse soluzioni per soddisfare le tue esigenze, dal piccolo imprenditore alla grande azienda."}
                </p>
              </div>

              <PricingTable
                googleData={googleData}
                isGoogleSignup={isGoogleSignup}
                facebookData={facebookData}
                isFacebookSignup={isFacebookSignup}
                userSelectedPlanId={userSelectedPlanId}
                isEmailPasswordUser={isEmailPasswordUser}
                tempUserData={tempUserData}
              />

              <div className="mt-20 text-center">
                <h2 className="text-2xl font-semibold mb-6">
                  Domande frequenti sui prezzi
                </h2>
                <div className="max-w-3xl mx-auto grid gap-6">
                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="font-medium text-lg mb-2">
                      Ci sono costi nascosti?
                    </h3>
                    <p className="text-gray-600">
                      No, il prezzo indicato è quello definitivo. Non ci sono
                      costi aggiuntivi o nascosti.
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="font-medium text-lg mb-2">
                      Posso cambiare piano in futuro?
                    </h3>
                    <p className="text-gray-600">
                      Certamente! Puoi passare a un piano superiore in qualsiasi
                      momento.
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="font-medium text-lg mb-2">
                      È previsto un rimborso se non sono soddisfatto?
                    </h3>
                    <p className="text-gray-600">
                      Sì, offriamo una garanzia di rimborso di 14 giorni se non
                      sei completamente soddisfatto del servizio.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Pricing;
