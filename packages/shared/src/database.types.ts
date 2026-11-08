// Generated from the live schema. Regenerate with `pnpm gen:types` once the Supabase CLI is linked.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      biometric_snapshots: {
        Row: {
          id: string
          user_id: string
          metrics: Json
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          metrics?: Json
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          metrics?: Json
          note?: string | null
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: "biometric_snapshots_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      biometrics: {
        Row: {
          id: string
          user_id: string
          metric_type: string
          value: number
          unit: string
          logged_at: string
          notes: string | null
          created_at: string
          meal_group: number | null
        }
        Insert: {
          id?: string
          user_id: string
          metric_type: string
          value: number
          unit: string
          logged_at: string
          notes?: string | null
          created_at?: string
          meal_group?: number | null
        }
        Update: {
          id?: string
          user_id?: string
          metric_type?: string
          value?: number
          unit?: string
          logged_at?: string
          notes?: string | null
          created_at?: string
          meal_group?: number | null
        }
        Relationships: [
          { foreignKeyName: "biometrics_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      custom_food_nutrient_values: {
        Row: {
          custom_food_id: string
          nutrient_id: number
          value: number
        }
        Insert: {
          custom_food_id: string
          nutrient_id: number
          value: number
        }
        Update: {
          custom_food_id?: string
          nutrient_id?: number
          value?: number
        }
        Relationships: [
          { foreignKeyName: "custom_food_nutrient_values_custom_food_id_fkey"; columns: ["custom_food_id"]; isOneToOne: false; referencedRelation: "custom_foods"; referencedColumns: ["id"] },
          { foreignKeyName: "custom_food_nutrient_values_nutrient_id_fkey"; columns: ["nutrient_id"]; isOneToOne: false; referencedRelation: "nutrients"; referencedColumns: ["id"] },
        ]
      }
      custom_foods: {
        Row: {
          id: string
          user_id: string
          name: string
          serving_size: number | null
          serving_unit: string | null
          created_at: string
          brand: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          serving_size?: number | null
          serving_unit?: string | null
          created_at?: string
          brand?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          serving_size?: number | null
          serving_unit?: string | null
          created_at?: string
          brand?: string | null
        }
        Relationships: [
          { foreignKeyName: "custom_foods_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      custom_meal_items: {
        Row: {
          id: string
          custom_meal_id: string | null
          food_id: string | null
          custom_food_id: string | null
          quantity: number
        }
        Insert: {
          id?: string
          custom_meal_id?: string | null
          food_id?: string | null
          custom_food_id?: string | null
          quantity?: number
        }
        Update: {
          id?: string
          custom_meal_id?: string | null
          food_id?: string | null
          custom_food_id?: string | null
          quantity?: number
        }
        Relationships: [
          { foreignKeyName: "custom_meal_items_custom_food_id_fkey"; columns: ["custom_food_id"]; isOneToOne: false; referencedRelation: "custom_foods"; referencedColumns: ["id"] },
          { foreignKeyName: "custom_meal_items_custom_meal_id_fkey"; columns: ["custom_meal_id"]; isOneToOne: false; referencedRelation: "custom_meals"; referencedColumns: ["id"] },
          { foreignKeyName: "custom_meal_items_food_id_fkey"; columns: ["food_id"]; isOneToOne: false; referencedRelation: "foods"; referencedColumns: ["id"] },
        ]
      }
      custom_meals: {
        Row: {
          id: string
          user_id: string | null
          name: string
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          created_at?: string | null
        }
        Relationships: [
        ]
      }
      diary_entries: {
        Row: {
          id: string
          user_id: string
          food_id: string | null
          meal_type: string
          quantity: number
          serving_unit: string
          logged_at: string
          created_at: string
          meal_group: number | null
          custom_food_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          food_id?: string | null
          meal_type: string
          quantity: number
          serving_unit: string
          logged_at: string
          created_at?: string
          meal_group?: number | null
          custom_food_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          food_id?: string | null
          meal_type?: string
          quantity?: number
          serving_unit?: string
          logged_at?: string
          created_at?: string
          meal_group?: number | null
          custom_food_id?: string | null
        }
        Relationships: [
          { foreignKeyName: "diary_entries_custom_food_id_fkey"; columns: ["custom_food_id"]; isOneToOne: false; referencedRelation: "custom_foods"; referencedColumns: ["id"] },
          { foreignKeyName: "diary_entries_food_id_fkey"; columns: ["food_id"]; isOneToOne: false; referencedRelation: "foods"; referencedColumns: ["id"] },
          { foreignKeyName: "diary_entries_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      diary_nutrient_values: {
        Row: {
          diary_entry_id: string
          nutrient_id: number
          value: number
        }
        Insert: {
          diary_entry_id: string
          nutrient_id: number
          value: number
        }
        Update: {
          diary_entry_id?: string
          nutrient_id?: number
          value?: number
        }
        Relationships: [
          { foreignKeyName: "diary_nutrient_values_diary_entry_id_fkey"; columns: ["diary_entry_id"]; isOneToOne: false; referencedRelation: "diary_entries"; referencedColumns: ["id"] },
          { foreignKeyName: "diary_nutrient_values_nutrient_id_fkey"; columns: ["nutrient_id"]; isOneToOne: false; referencedRelation: "nutrients"; referencedColumns: ["id"] },
        ]
      }
      exercise_log: {
        Row: {
          id: string
          user_id: string
          exercise_name: string
          category: string
          duration_minutes: number
          calories_burned: number | null
          logged_at: string
          notes: string | null
          created_at: string
          meal_group: number | null
        }
        Insert: {
          id?: string
          user_id: string
          exercise_name: string
          category: string
          duration_minutes: number
          calories_burned?: number | null
          logged_at: string
          notes?: string | null
          created_at?: string
          meal_group?: number | null
        }
        Update: {
          id?: string
          user_id?: string
          exercise_name?: string
          category?: string
          duration_minutes?: number
          calories_burned?: number | null
          logged_at?: string
          notes?: string | null
          created_at?: string
          meal_group?: number | null
        }
        Relationships: [
          { foreignKeyName: "exercise_log_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      fasting_log: {
        Row: {
          id: string
          user_id: string
          started_at: string
          ended_at: string | null
          target_duration_hours: number | null
          completed: boolean
          notes: string | null
        }
        Insert: {
          id?: string
          user_id: string
          started_at: string
          ended_at?: string | null
          target_duration_hours?: number | null
          completed?: boolean
          notes?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          started_at?: string
          ended_at?: string | null
          target_duration_hours?: number | null
          completed?: boolean
          notes?: string | null
        }
        Relationships: [
          { foreignKeyName: "fasting_log_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      food_nutrient_values: {
        Row: {
          food_id: string
          nutrient_id: number
          value: number
        }
        Insert: {
          food_id: string
          nutrient_id: number
          value: number
        }
        Update: {
          food_id?: string
          nutrient_id?: number
          value?: number
        }
        Relationships: [
          { foreignKeyName: "food_nutrient_values_food_id_fkey"; columns: ["food_id"]; isOneToOne: false; referencedRelation: "foods"; referencedColumns: ["id"] },
          { foreignKeyName: "food_nutrient_values_nutrient_id_fkey"; columns: ["nutrient_id"]; isOneToOne: false; referencedRelation: "nutrients"; referencedColumns: ["id"] },
        ]
      }
      foods: {
        Row: {
          id: string
          name: string
          brand: string | null
          source: string
          is_verified: boolean
          serving_size: number | null
          serving_unit: string | null
          created_by: string | null
          created_at: string
          fdc_id: number | null
          category: string | null
        }
        Insert: {
          id?: string
          name: string
          brand?: string | null
          source?: string
          is_verified?: boolean
          serving_size?: number | null
          serving_unit?: string | null
          created_by?: string | null
          created_at?: string
          fdc_id?: number | null
          category?: string | null
        }
        Update: {
          id?: string
          name?: string
          brand?: string | null
          source?: string
          is_verified?: boolean
          serving_size?: number | null
          serving_unit?: string | null
          created_by?: string | null
          created_at?: string
          fdc_id?: number | null
          category?: string | null
        }
        Relationships: [
          { foreignKeyName: "foods_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      notes: {
        Row: {
          id: string
          user_id: string
          content: string
          created_at: string
          meal_group: number | null
        }
        Insert: {
          id?: string
          user_id: string
          content: string
          created_at?: string
          meal_group?: number | null
        }
        Update: {
          id?: string
          user_id?: string
          content?: string
          created_at?: string
          meal_group?: number | null
        }
        Relationships: [
          { foreignKeyName: "notes_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      nutrients: {
        Row: {
          id: number
          name: string
          unit: string
          category: string
        }
        Insert: {
          id: number
          name: string
          unit: string
          category: string
        }
        Update: {
          id?: number
          name?: string
          unit?: string
          category?: string
        }
        Relationships: [
        ]
      }
      profiles: {
        Row: {
          id: string
          display_name: string | null
          units_preference: string
          calorie_goal: number | null
          weight_goal: number | null
          weight_goal_type: string | null
          subscription_tier: string
          created_at: string
          updated_at: string
          date_of_birth: string | null
          sex: string | null
          height_cm: number | null
          activity_level: string | null
          weekly_rate: number | null
          display_settings: Json | null
        }
        Insert: {
          id: string
          display_name?: string | null
          units_preference?: string
          calorie_goal?: number | null
          weight_goal?: number | null
          weight_goal_type?: string | null
          subscription_tier?: string
          created_at?: string
          updated_at?: string
          date_of_birth?: string | null
          sex?: string | null
          height_cm?: number | null
          activity_level?: string | null
          weekly_rate?: number | null
          display_settings?: Json | null
        }
        Update: {
          id?: string
          display_name?: string | null
          units_preference?: string
          calorie_goal?: number | null
          weight_goal?: number | null
          weight_goal_type?: string | null
          subscription_tier?: string
          created_at?: string
          updated_at?: string
          date_of_birth?: string | null
          sex?: string | null
          height_cm?: number | null
          activity_level?: string | null
          weekly_rate?: number | null
          display_settings?: Json | null
        }
        Relationships: [
        ]
      }
      recipe_ingredients: {
        Row: {
          id: string
          recipe_id: string
          food_id: string
          quantity: number
          serving_unit: string
        }
        Insert: {
          id?: string
          recipe_id: string
          food_id: string
          quantity: number
          serving_unit: string
        }
        Update: {
          id?: string
          recipe_id?: string
          food_id?: string
          quantity?: number
          serving_unit?: string
        }
        Relationships: [
          { foreignKeyName: "recipe_ingredients_food_id_fkey"; columns: ["food_id"]; isOneToOne: false; referencedRelation: "foods"; referencedColumns: ["id"] },
          { foreignKeyName: "recipe_ingredients_recipe_id_fkey"; columns: ["recipe_id"]; isOneToOne: false; referencedRelation: "recipes"; referencedColumns: ["id"] },
        ]
      }
      recipes: {
        Row: {
          id: string
          user_id: string
          name: string
          servings: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          servings?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          servings?: number
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: "recipes_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      sleep_log: {
        Row: {
          id: string
          user_id: string
          sleep_start: string
          sleep_end: string
          duration_minutes: number
          source: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          sleep_start: string
          sleep_end: string
          duration_minutes: number
          source?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          sleep_start?: string
          sleep_end?: string
          duration_minutes?: number
          source?: string
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: "sleep_log_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      streaks: {
        Row: {
          id: string
          user_id: string
          current_streak: number
          longest_streak: number
          last_logged_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          current_streak?: number
          longest_streak?: number
          last_logged_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          current_streak?: number
          longest_streak?: number
          last_logged_at?: string | null
        }
        Relationships: [
          { foreignKeyName: "streaks_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

type PublicSchema = Database['public']
export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row']
export type TablesInsert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update']
