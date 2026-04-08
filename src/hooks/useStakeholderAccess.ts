import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "./useUserRole";

export const STAKEHOLDER_PAGES = [
  { key: "ysa_conecta", label: "YSA Conecta", href: "/" },
  { key: "noticias", label: "Noticias", href: "/news" },
  { key: "classroom", label: "Classroom", href: "/lab" },
  { key: "calendario", label: "Calendario", href: "/calendario" },
  { key: "mentorias", label: "Mentorías", href: "/mentorias" },
  { key: "admin", label: "Admin Panel", href: "/admin" },
  { key: "perfil", label: "Perfil", href: "/profile" },
] as const;

export type StakeholderPageKey = typeof STAKEHOLDER_PAGES[number]["key"];

/**
 * Returns the set of page keys a stakeholder is allowed to access.
 * If null, the stakeholder has access to everything (no restrictions).
 * Non-stakeholders always get null (no restrictions apply).
 */
export const useStakeholderAccess = () => {
  const { isStakeholder, userId, loading: roleLoading } = useUserRole();
  const [allowedPages, setAllowedPages] = useState<Set<string> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (roleLoading) return;

    if (!isStakeholder || !userId) {
      setAllowedPages(null);
      setLoading(false);
      return;
    }

    const fetch = async () => {
      try {
        const { data } = await supabase
          .from("stakeholder_filtros")
          .select("valor")
          .eq("user_id", userId)
          .eq("campo", "pagina_acceso")
          .eq("activo", true);

        if (!data || data.length === 0) {
          setAllowedPages(null); // no restrictions
        } else {
          setAllowedPages(new Set(data.map((d) => d.valor)));
        }
      } catch (err) {
        console.error("Error fetching stakeholder page access:", err);
        setAllowedPages(null);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [isStakeholder, userId, roleLoading]);

  const canAccessPage = (pageKey: string): boolean => {
    if (allowedPages === null) return true; // no restrictions
    return allowedPages.has(pageKey);
  };

  const canAccessHref = (href: string): boolean => {
    if (allowedPages === null) return true;
    const page = STAKEHOLDER_PAGES.find((p) => p.href === href);
    if (!page) return true; // unknown pages are allowed
    return allowedPages.has(page.key);
  };

  return { allowedPages, loading: loading || roleLoading, canAccessPage, canAccessHref };
};
