import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '../services/auth'
import { useAuth } from '../context/AuthContext'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Field, FieldLabel, FieldGroup } from '../components/ui/field'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import citLogo from '../assets/images/citlogo.png'
import { useSearchParams } from 'react-router-dom'

// get callback url from query params
function Login() {

  const [searchParams] = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl')



  const navigate = useNavigate()

  

  

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { refreshProfile, isAuthenticated } = useAuth()

  useEffect(() => {
    if (isAuthenticated) {
      if (callbackUrl) {
        window.location.href = callbackUrl;
      } else {
        navigate('/')
      }
    }
  }, [isAuthenticated, callbackUrl, navigate])


  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      await refreshProfile()

      if (callbackUrl) {
        window.location.href = callbackUrl;
      } else {
        navigate('/')
      }

    } catch (err: any) {
      setError(err.response?.data?.msg || 'Login failed. Please try again.')
      console.log(err.response?.data?.msg)
      if (err.response?.status === 403) {
        localStorage.setItem('email', email)
        navigate('/verify-pending')
      }

      console.error('Login error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className='flex justify-between items-center'>
            <div>
              <p className=' text-muted-foreground text-sm font-medium'>Welcome</p>
              <CardTitle className='text-2xl font-semibold'>Login</CardTitle>
            </div>
            <img src={citLogo} alt="CIT" className="w-20 h-20 object-contain shrink-0" />
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="hcps-name@henricostudents.org"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>

                <Field>
                  <div className="flex items-center">
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <a
                      href="#"
                      className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                    >
                      Forgot your password?
                    </a>
                  </div>
                  <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </Field>
                <Field className="mt-5">
                  <Button type="submit" className="shadow-2xl" disabled={loading}>{loading ? 'Logging In...' : 'Login'}</Button>
                  {error && <p className="text-sm text-center mt-1 text-destructive">{error}</p>}
                  <Link to="/register" className="text-sm text-center mt-1 text-muted-foreground hover:underline">Don't have an account? Register</Link>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Login;