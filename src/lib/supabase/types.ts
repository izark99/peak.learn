/**
 * Generated from the live schema:
 *   supabase gen types typescript --project-id fqcskypwfhdltwulfyci
 * Regenerate after every migration rather than hand-editing.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      ai_generations: {
        Row: {
          created_at: string;
          id: string;
          input_summary: string;
          input_tokens: number | null;
          kind: string;
          model: string;
          output_tokens: number | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          input_summary?: string;
          input_tokens?: number | null;
          kind: string;
          model?: string;
          output_tokens?: number | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          input_summary?: string;
          input_tokens?: number | null;
          kind?: string;
          model?: string;
          output_tokens?: number | null;
          user_id?: string;
        };
        Relationships: [];
      };
      assignment_progress: {
        Row: {
          accuracy: number;
          assignment_id: string;
          cards_completed: number;
          completed_at: string | null;
          id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          accuracy?: number;
          assignment_id: string;
          cards_completed?: number;
          completed_at?: string | null;
          id?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          accuracy?: number;
          assignment_id?: string;
          cards_completed?: number;
          completed_at?: string | null;
          id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      cards: {
        Row: {
          confusables: string[];
          created_at: string;
          deck_id: string;
          example_sentence: string;
          example_translation: string;
          id: string;
          image_url: string | null;
          part_of_speech: string;
          phonetic: string;
          position: number;
          synonyms: string[];
          term: string;
          translation: string;
        };
        Insert: {
          confusables?: string[];
          created_at?: string;
          deck_id: string;
          example_sentence?: string;
          example_translation?: string;
          id?: string;
          image_url?: string | null;
          part_of_speech?: string;
          phonetic?: string;
          position?: number;
          synonyms?: string[];
          term: string;
          translation?: string;
        };
        Update: {
          confusables?: string[];
          created_at?: string;
          deck_id?: string;
          example_sentence?: string;
          example_translation?: string;
          id?: string;
          image_url?: string | null;
          part_of_speech?: string;
          phonetic?: string;
          position?: number;
          synonyms?: string[];
          term?: string;
          translation?: string;
        };
        Relationships: [];
      };
      class_assignments: {
        Row: {
          class_id: string;
          created_at: string;
          deck_id: string;
          due_at: string | null;
          id: string;
          title: string;
        };
        Insert: {
          class_id: string;
          created_at?: string;
          deck_id: string;
          due_at?: string | null;
          id?: string;
          title?: string;
        };
        Update: {
          class_id?: string;
          created_at?: string;
          deck_id?: string;
          due_at?: string | null;
          id?: string;
          title?: string;
        };
        Relationships: [];
      };
      class_members: {
        Row: {
          class_id: string;
          joined_at: string;
          role: string;
          user_id: string;
        };
        Insert: {
          class_id: string;
          joined_at?: string;
          role?: string;
          user_id: string;
        };
        Update: {
          class_id?: string;
          joined_at?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      classes: {
        Row: {
          archived: boolean;
          created_at: string;
          description: string;
          id: string;
          join_code: string;
          name: string;
          target_language: string;
          teacher_id: string;
          updated_at: string;
        };
        Insert: {
          archived?: boolean;
          created_at?: string;
          description?: string;
          id?: string;
          join_code: string;
          name: string;
          target_language?: string;
          teacher_id: string;
          updated_at?: string;
        };
        Update: {
          archived?: boolean;
          created_at?: string;
          description?: string;
          id?: string;
          join_code?: string;
          name?: string;
          target_language?: string;
          teacher_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      decks: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          origin: string;
          owner_id: string;
          source_language: string;
          target_language: string;
          title: string;
          updated_at: string;
          visibility: string;
        };
        Insert: {
          created_at?: string;
          description?: string;
          id?: string;
          origin?: string;
          owner_id: string;
          source_language?: string;
          target_language?: string;
          title: string;
          updated_at?: string;
          visibility?: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          origin?: string;
          owner_id?: string;
          source_language?: string;
          target_language?: string;
          title?: string;
          updated_at?: string;
          visibility?: string;
        };
        Relationships: [];
      };
      grammar_attempts: {
        Row: {
          created_at: string;
          exercise_id: string;
          id: string;
          is_correct: boolean;
          response: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          exercise_id: string;
          id?: string;
          is_correct?: boolean;
          response?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          exercise_id?: string;
          id?: string;
          is_correct?: boolean;
          response?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      grammar_exercises: {
        Row: {
          accepted_answers: string[];
          answer: string;
          created_at: string;
          deck_id: string | null;
          hint: string;
          id: string;
          kind: string;
          owner_id: string;
          prompt: string;
          target_language: string;
          tokens: string[];
        };
        Insert: {
          accepted_answers?: string[];
          answer: string;
          created_at?: string;
          deck_id?: string | null;
          hint?: string;
          id?: string;
          kind: string;
          owner_id: string;
          prompt: string;
          target_language?: string;
          tokens?: string[];
        };
        Update: {
          accepted_answers?: string[];
          answer?: string;
          created_at?: string;
          deck_id?: string | null;
          hint?: string;
          id?: string;
          kind?: string;
          owner_id?: string;
          prompt?: string;
          target_language?: string;
          tokens?: string[];
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          daily_goal: number;
          display_name: string;
          id: string;
          last_studied_on: string | null;
          native_language: string;
          streak_count: number;
          target_language: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          daily_goal?: number;
          display_name?: string;
          id: string;
          last_studied_on?: string | null;
          native_language?: string;
          streak_count?: number;
          target_language?: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          daily_goal?: number;
          display_name?: string;
          id?: string;
          last_studied_on?: string | null;
          native_language?: string;
          streak_count?: number;
          target_language?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      review_logs: {
        Row: {
          card_id: string;
          id: string;
          mode: string;
          new_interval: number;
          previous_interval: number;
          rating: number;
          reviewed_at: string;
          user_id: string;
        };
        Insert: {
          card_id: string;
          id?: string;
          mode?: string;
          new_interval?: number;
          previous_interval?: number;
          rating: number;
          reviewed_at?: string;
          user_id: string;
        };
        Update: {
          card_id?: string;
          id?: string;
          mode?: string;
          new_interval?: number;
          previous_interval?: number;
          rating?: number;
          reviewed_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      review_states: {
        Row: {
          card_id: string;
          due_at: string;
          ease_factor: number;
          id: string;
          interval_days: number;
          lapses: number;
          last_reviewed_at: string | null;
          learning_step: number;
          repetitions: number;
          state: string;
          user_id: string;
        };
        Insert: {
          card_id: string;
          due_at?: string;
          ease_factor?: number;
          id?: string;
          interval_days?: number;
          lapses?: number;
          last_reviewed_at?: string | null;
          learning_step?: number;
          repetitions?: number;
          state?: string;
          user_id: string;
        };
        Update: {
          card_id?: string;
          due_at?: string;
          ease_factor?: number;
          id?: string;
          interval_days?: number;
          lapses?: number;
          last_reviewed_at?: string | null;
          learning_step?: number;
          repetitions?: number;
          state?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      speaking_scenarios: {
        Row: {
          ai_role: string;
          created_at: string;
          description: string;
          id: string;
          is_template: boolean;
          level: string;
          owner_id: string | null;
          required_card_ids: string[];
          setting: string;
          target_language: string;
          title: string;
          user_role: string;
        };
        Insert: {
          ai_role?: string;
          created_at?: string;
          description?: string;
          id?: string;
          is_template?: boolean;
          level?: string;
          owner_id?: string | null;
          required_card_ids?: string[];
          setting?: string;
          target_language?: string;
          title: string;
          user_role?: string;
        };
        Update: {
          ai_role?: string;
          created_at?: string;
          description?: string;
          id?: string;
          is_template?: boolean;
          level?: string;
          owner_id?: string | null;
          required_card_ids?: string[];
          setting?: string;
          target_language?: string;
          title?: string;
          user_role?: string;
        };
        Relationships: [];
      };
      speaking_sessions: {
        Row: {
          ended_at: string | null;
          id: string;
          scenario_id: string;
          started_at: string;
          turn_count: number;
          user_id: string;
          vocab_used_count: number;
        };
        Insert: {
          ended_at?: string | null;
          id?: string;
          scenario_id: string;
          started_at?: string;
          turn_count?: number;
          user_id: string;
          vocab_used_count?: number;
        };
        Update: {
          ended_at?: string | null;
          id?: string;
          scenario_id?: string;
          started_at?: string;
          turn_count?: number;
          user_id?: string;
          vocab_used_count?: number;
        };
        Relationships: [];
      };
      speaking_turns: {
        Row: {
          audio_duration_ms: number | null;
          created_at: string;
          id: string;
          pronunciation_score: Json | null;
          session_id: string;
          speaker: string;
          text: string;
        };
        Insert: {
          audio_duration_ms?: number | null;
          created_at?: string;
          id?: string;
          pronunciation_score?: Json | null;
          session_id: string;
          speaker: string;
          text?: string;
        };
        Update: {
          audio_duration_ms?: number | null;
          created_at?: string;
          id?: string;
          pronunciation_score?: Json | null;
          session_id?: string;
          speaker?: string;
          text?: string;
        };
        Relationships: [];
      };
      study_sessions: {
        Row: {
          cards_studied: number;
          correct_count: number;
          deck_id: string | null;
          ended_at: string | null;
          id: string;
          mode: string;
          started_at: string;
          user_id: string;
        };
        Insert: {
          cards_studied?: number;
          correct_count?: number;
          deck_id?: string | null;
          ended_at?: string | null;
          id?: string;
          mode: string;
          started_at?: string;
          user_id: string;
        };
        Update: {
          cards_studied?: number;
          correct_count?: number;
          deck_id?: string | null;
          ended_at?: string | null;
          id?: string;
          mode?: string;
          started_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];

// Convenience aliases used throughout the app.
export type Profile = Tables<"profiles">;
export type Deck = Tables<"decks">;
export type Card = Tables<"cards">;
export type ReviewState = Tables<"review_states">;
export type StudySession = Tables<"study_sessions">;
export type GrammarExercise = Tables<"grammar_exercises">;
export type SpeakingScenario = Tables<"speaking_scenarios">;
export type SpeakingSession = Tables<"speaking_sessions">;
export type SpeakingTurn = Tables<"speaking_turns">;
export type ClassRow = Tables<"classes">;
export type ClassMember = Tables<"class_members">;
export type ClassAssignment = Tables<"class_assignments">;
export type AssignmentProgress = Tables<"assignment_progress">;
