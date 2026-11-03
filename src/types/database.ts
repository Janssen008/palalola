export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          full_name: string;
          role: 'admin' | 'user' | 'department_head' | 'oic';
          office_id: string | null;
          position_title: string | null;
          force_password_reset: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name: string;
          role?: 'admin' | 'user' | 'department_head' | 'oic';
          office_id?: string | null;
          position_title?: string | null;
          force_password_reset?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          full_name?: string;
          role?: 'admin' | 'user' | 'department_head' | 'oic';
          office_id?: string | null;
          position_title?: string | null;
          force_password_reset?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_office_id_fkey';
            columns: ['office_id'];
            isOneToOne: false;
            referencedRelation: 'offices';
            referencedColumns: ['id'];
          }
        ];
      };
      offices: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };

      app_settings: {
        Row: {
          id: string;
          key: string;
          value: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          value: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          value?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      task_logs: {
        Row: {
          id: string;
          user_id: string;
          custom_title: string;
          office_id: string | null;
          logged_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          custom_title: string;
          office_id?: string | null;
          logged_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          custom_title?: string;
          office_id?: string | null;
          logged_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      admin_delete_user: {
        Args: {
          target_user_id: string;
        };
        Returns: void;
      };
      admin_reset_user_password: {
        Args: {
          target_user_id: string;
          new_password: string;
        };
        Returns: void;
      };
      get_office_dept_head: {
        Args: {
          p_office_id: string;
        };
        Returns: {
          full_name: string;
          role: string;
        }[];
      };
    };
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Office = Database['public']['Tables']['offices']['Row'];

export type AppSettings = Database['public']['Tables']['app_settings']['Row'];
export type TaskLog = Database['public']['Tables']['task_logs']['Row'];
