
import { useState, useEffect } from 'react';
import * as QRCode from 'qrcode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, Mail } from 'lucide-react';

interface EmailVerificationQRProps {
  email: string;
  onVerificationComplete: () => void;
}

const EmailVerificationQR = ({ email, onVerificationComplete }: EmailVerificationQRProps) => {
  const [qrCode, setQrCode] = useState<string>('');
  const [otp, setOTP] = useState<string>('');
  const [userEnteredOTP, setUserEnteredOTP] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [expiryTime, setExpiryTime] = useState<number>(0);

  const generateOTP = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const sendOTPEmail = async (otpCode: string) => {
    setIsSendingOTP(true);
    try {
      const { error } = await supabase.functions.invoke('send-otp-email', {
        body: { email, otp: otpCode }
      });

      if (error) throw error;

      setOtpSent(true);
      setExpiryTime(Date.now() + 10 * 60 * 1000); // 10 minutes from now
      
      toast({
        title: "OTP Sent",
        description: `A 6-digit verification code has been sent to ${email}`,
      });
    } catch (error) {
      console.error('Error sending OTP:', error);
      toast({
        title: "Error",
        description: "Failed to send verification code. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSendingOTP(false);
    }
  };

  const generateVerificationQR = async () => {
    setIsGenerating(true);
    try {
      // Generate OTP
      const otpCode = generateOTP();
      setOTP(otpCode);

      // Send OTP to email
      await sendOTPEmail(otpCode);

      // Create verification URL with OTP
      const verificationUrl = `${window.location.origin}/verify-email?otp=${otpCode}&email=${encodeURIComponent(email)}`;
      
      // Generate QR code
      const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      setQrCode(qrCodeDataUrl);
      
      toast({
        title: "QR Code Generated",
        description: "Scan the QR code with your mobile device or enter the code from your email.",
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: "Error",
        description: "Failed to generate verification. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const verifyOTP = async (otpToVerify: string) => {
    setIsVerifying(true);
    try {
      if (otpToVerify === otp && Date.now() < expiryTime) {
        // OTP is valid, complete verification
        onVerificationComplete();
        
        toast({
          title: "Email Verified!",
          description: "Your email has been successfully verified.",
        });
      } else if (Date.now() >= expiryTime) {
        toast({
          title: "Code Expired",
          description: "The verification code has expired. Please generate a new one.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Invalid Code",
          description: "The verification code is incorrect. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      toast({
        title: "Verification Error",
        description: "An error occurred during verification. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleManualVerify = () => {
    if (userEnteredOTP.length === 6) {
      verifyOTP(userEnteredOTP);
    } else {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit verification code.",
        variant: "destructive"
      });
    }
  };

  const getTimeRemaining = (): string => {
    const remaining = Math.max(0, expiryTime - Date.now());
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    generateVerificationQR();
  }, [email]);

  // Update timer every second
  useEffect(() => {
    if (expiryTime > 0) {
      const interval = setInterval(() => {
        if (Date.now() >= expiryTime) {
          setOtpSent(false);
          setOTP('');
          setQrCode('');
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [expiryTime]);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Email Verification</CardTitle>
        <CardDescription>
          Verify your email using the QR code or the code sent to your email
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center">
          {isGenerating ? (
            <div className="w-64 h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : qrCode ? (
            <img 
              src={qrCode} 
              alt="Email verification QR code" 
              className="border rounded-lg shadow-md"
            />
          ) : (
            <div className="w-64 h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-500">QR Code failed to generate</p>
            </div>
          )}
        </div>
        
        <div className="text-center text-sm text-muted-foreground">
          <p className="flex items-center justify-center gap-2">
            <Mail className="h-4 w-4" />
            {email}
          </p>
          {otpSent && expiryTime > Date.now() && (
            <p className="mt-2 text-green-600">
              Code expires in: {getTimeRemaining()}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or enter code manually
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="otp">6-Digit Verification Code</Label>
            <Input
              id="otp"
              type="text"
              placeholder="Enter 6-digit code"
              value={userEnteredOTP}
              onChange={(e) => setUserEnteredOTP(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              className="text-center text-lg tracking-widest"
            />
          </div>

          <Button 
            onClick={handleManualVerify} 
            className="w-full"
            disabled={isVerifying || userEnteredOTP.length !== 6 || !otpSent}
          >
            {isVerifying ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Verify Code
          </Button>
        </div>

        <Button 
          onClick={generateVerificationQR} 
          variant="outline" 
          className="w-full"
          disabled={isGenerating || isSendingOTP}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${(isGenerating || isSendingOTP) ? 'animate-spin' : ''}`} />
          {isSendingOTP ? 'Sending Code...' : 'Send New Code'}
        </Button>

        <div className="text-xs text-center text-muted-foreground">
          <p>Check your email inbox for the 6-digit verification code.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmailVerificationQR;
