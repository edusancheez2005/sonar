'use client'
import { createClient } from '@supabase/supabase-js'

export const supabaseBrowser = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fwbwfvqzomipoftgodof.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3YndmdnF6b21pcG9mdGdvZG9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5Mjc3MzMsImV4cCI6MjA2MzUwMzczM30.Fw0Ejr7yrMRjP1WFXjSnJxwNQUe8O_Dzhv96E1OvEl8'
  return createClient(url, key)
} 