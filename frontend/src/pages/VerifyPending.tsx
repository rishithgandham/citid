import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'

import citLogo from '../assets/images/citlogo.png'
import { Button } from '../components/ui/button'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { resendVerificationEmail } from '../services/auth'

function VerifyPending() {

    const navigate = useNavigate()

    useEffect(() => {
        const email = localStorage.getItem('email')
        if (!email) {
            navigate('/login')
            return;
        }
    }, [navigate])

    const [loading, setLoading] = useState(false)

    const handleClick = async () => {
        try {
            setLoading(true)
            await resendVerificationEmail(localStorage.getItem('email') || '')

        } catch (err) {
            console.error('Error resending verification email:', err)
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
                            <CardTitle className='text-2xl font-semibold'>Email Verification Sent</CardTitle>
                        </div>
                        <img src={citLogo} alt="CIT" className="w-20 h-20 object-contain shrink-0" />
                    </CardHeader>
                    <CardContent>
                        <p className=' text-muted-foreground text-sm font-medium'>A verification email has been sent to your email address. Please check your email and click the link to verify your account.</p>
                        <Button disabled={loading} className='mt-4' onClick={handleClick}>{loading ? 'Resending...' : 'Resend Verification Email'}</Button>
                    </CardContent>
                </Card>
            </div>
        </div>

    )
}

export default VerifyPending