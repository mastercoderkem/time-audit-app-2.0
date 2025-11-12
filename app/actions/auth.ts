'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(prevState: any, formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(prevState: any, formData: FormData) {
  try {
    const supabase = await createClient()

    const data = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    }

    console.log('Attempting signup with:', data.email)

    const { data: authData, error } = await supabase.auth.signUp(data)

    console.log('Signup response:', { authData, error })

    if (error) {
      console.error('Signup error:', error)
      return { error: error.message }
    }

    // Check if email confirmation is required
    if (authData?.user && !authData.session) {
      return { error: 'Please check your email to confirm your account before logging in.' }
    }

    // Success! Redirect to dashboard
    revalidatePath('/', 'layout')
    redirect('/dashboard')
  } catch (err: any) {
    // redirect() throws an error to perform navigation, which is expected
    if (err?.message?.includes('NEXT_REDIRECT')) {
      throw err
    }
    console.error('Unexpected signup error:', err)
    return { error: 'An unexpected error occurred. Please try again.' }
  }
}

export async function signout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
