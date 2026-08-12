/**
 * Types de la base de données Supabase.
 *
 * ⚠️ Fichier provisoire, écrit à la main d'après la section « Schéma de base de
 * données recommandé » du cahier des charges (docs/brief-app-electeurs.md).
 * Une fois les migrations appliquées, régénérez-le depuis la base réelle :
 *
 *   npx supabase gen types typescript --project-id <ref> > src/types/database.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/** Rôles applicatifs (cf. sections 17-19 du cahier des charges). */
export type UserRole = "super_admin" | "saisie" | "parlementaire";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          phone: string | null;
          role: UserRole;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          phone?: string | null;
          role?: UserRole;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          phone?: string | null;
          role?: UserRole;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      cadres: {
        Row: {
          id: string;
          /** Unique parmi les cadres uniquement — un cadre peut aussi figurer
           *  dans `electeurs` avec le même CIN. */
          cin: string;
          full_name: string;
          phone: string | null;
          polling_station_number: string;
          polling_location: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cin: string;
          full_name: string;
          phone?: string | null;
          polling_station_number: string;
          polling_location: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cin?: string;
          full_name?: string;
          phone?: string | null;
          polling_station_number?: string;
          polling_location?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      electeurs: {
        Row: {
          id: string;
          cadre_id: string;
          /** Rendu unique par une contrainte UNIQUE PostgreSQL. */
          cin: string;
          full_name: string;
          phone: string | null;
          polling_station_number: string | null;
          polling_location: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cadre_id: string;
          cin: string;
          full_name: string;
          phone?: string | null;
          polling_station_number?: string | null;
          polling_location?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cadre_id?: string;
          cin?: string;
          full_name?: string;
          phone?: string | null;
          polling_station_number?: string | null;
          polling_location?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "electeurs_cadre_id_fkey";
            columns: ["cadre_id"];
            referencedRelation: "cadres";
            referencedColumns: ["id"];
          },
        ];
      };
      user_cadres: {
        Row: {
          user_id: string;
          cadre_id: string;
        };
        Insert: {
          user_id: string;
          cadre_id: string;
        };
        Update: {
          user_id?: string;
          cadre_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_cadres_cadre_id_fkey";
            columns: ["cadre_id"];
            referencedRelation: "cadres";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_cadres_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      settings: {
        Row: {
          id: string;
          party_name: string | null;
          territorial_community: string | null;
          logo_url: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          party_name?: string | null;
          territorial_community?: string | null;
          logo_url?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          party_name?: string | null;
          territorial_community?: string | null;
          logo_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      /** Cadres + nombre d'électeurs calculé. `security_invoker` : le RLS de
       *  `cadres` et `electeurs` s'applique à l'appelant. */
      cadres_with_counts: {
        Row: {
          id: string;
          cin: string;
          full_name: string;
          phone: string | null;
          polling_station_number: string;
          polling_location: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          electeurs_count: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      /** Vrai si le CIN est déjà pris par un autre cadre, tous périmètres RLS
       *  confondus. Ne renvoie qu'un booléen. */
      cadre_cin_exists: {
        Args: { p_cin: string; p_exclude_id?: string | null };
        Returns: boolean;
      };
    };
    Enums: {
      user_role: UserRole;
    };
    CompositeTypes: Record<never, never>;
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];
