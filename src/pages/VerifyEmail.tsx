
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [manualOTP, setManualOTP] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  
  const urlOTP = searchParams.get('otp');
  const email = searchParams.get('email');

  const verifyOTP = async (otpToVerify: string) => {
    setIsVerifying(true);
    try {
      // In a real app, you'd verify this against your backend
      // For this demo, we'll simulate verification
      if (otpToVerify && otpToVerify.length === 6) {
        setVerificationStatus('success');
        
        // Store verification success in localStorage for the main app to detect
        if (email) {
          localStorage.setItem(`email_verified_${email}`, 'true');
        }
        
        toast({
          title: "Email Verified!",
          description: "Your email has been successfully verified.",
        });
        
        // Auto-close after success (useful for mobile)
        setTimeout(() => {
          window.close();
        }, 3000);
      } else {
        setVerificationStatus('error');
        toast({
          title: "Verification Failed",
          description: "Invalid verification code.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationStatus('error');
      toast({
        title: "Verification Error",
        description: "An error occurred during verification. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleManualVerification = () => {
    if (manualOTP.length === 6) {
      verifyOTP(manualOTP);
    } else {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit verification code.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (urlOTP) {
      verifyOTP(urlOTP);
    }
  }, [urlOTP]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-theme-purple-light/20 to-theme-purple/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-theme-purple to-theme-purple-light bg-clip-text text-transparent">
            Email Verification
          </CardTitle>
          <CardDescription>
            {email ? `Verifying ${email}` : 'Verifying your email address'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {verificationStatus === 'pending' && (
            <div className="space-y-4">
              {urlOTP ? (
                <>
                  <Loader2 className="h-12 w-12 animate-spin text-theme-purple mx-auto" />
                  <p>Verifying your email...</p>
                </>
              ) : (
                <>
                  <div className="space-y-3">
                    <Label htmlFor="manual-otp">Enter 6-Digit Verification Code</Label>
                    <Input
                      id="manual-otp"
                      type="text"
                      placeholder="000000"
                      value={manualOTP}
                      onChange={(e) => setManualOTP(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      className="text-center text-lg tracking-widest"
                    />
                    <Button 
                      onClick={handleManualVerification}
                      disabled={isVerifying || manualOTP.length !== 6}
                      className="w-full"
                    >
                      {isVerifying ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : null}
                      Verify Email
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
          
          {verificationStatus === 'success' && (
            <div className="space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-green-700">Verification Successful!</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Your email has been verified successfully.
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                <p>This page will close automatically in a few seconds.</p>
                <p>You can now continue with your signup process.</p>
              </div>
            </div>
          )}
          
          {verificationStatus === 'error' && (
            <div className="space-y-4">
              <XCircle className="h-16 w-16 text-red-500 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-red-700">Verification Failed</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Unable to verify your email address.
                </p>
              </div>
              <Button onClick={() => navigate('/auth')} className="w-full">
                Return to Sign Up
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmail;
