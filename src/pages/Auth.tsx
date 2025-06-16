
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, AlertCircle, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { validateEmail, validatePassword } from '@/utils/validation';
import { authRateLimiter } from '@/utils/rateLimiter';

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };
    checkUser();
  }, [navigate]);

  const validateForm = (type: 'signin' | 'signup'): boolean => {
    let isValid = true;
    
    // Reset errors
    setEmailError('');
    setPasswordError('');

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.message || '');
      isValid = false;
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setPasswordError(passwordValidation.message || '');
      isValid = false;
    }

    // Additional validation for signup
    if (type === 'signup' && password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      isValid = false;
    }

    return isValid;
  };

  const handleEmailAuth = async (type: 'signin' | 'signup') => {
    // Check rate limiting
    const userIdentifier = email || 'anonymous';
    if (!authRateLimiter.canAttempt(userIdentifier)) {
      const remainingTime = authRateLimiter.getRemainingTime(userIdentifier);
      const minutes = Math.ceil(remainingTime / (1000 * 60));
      
      toast({
        title: "Too many attempts",
        description: `Please wait ${minutes} minutes before trying again`,
        variant: "destructive"
      });
      return;
    }

    // Validate form
    if (!validateForm(type)) {
      return;
    }

    try {
      setLoading(true);
      
      // Record attempt for rate limiting
      authRateLimiter.recordAttempt(userIdentifier);
      
      if (type === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        
        if (error) throw error;
        
        toast({
          title: "Welcome back!",
          description: "You have successfully signed in.",
        });
        navigate('/');
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`
          }
        });
        
        if (error) throw error;
        
        toast({
          title: "Account Created!",
          description: "Please check your email and click the verification link to complete your signup.",
        });
        
        // Reset form
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setEmailError('');
        setPasswordError('');
      }
    } catch (error: any) {
      let errorMessage = "An unexpected error occurred";
      
      if (error.message.includes("Invalid login credentials")) {
        errorMessage = "Invalid email or password";
      } else if (error.message.includes("User already registered")) {
        errorMessage = "An account with this email already exists";
      } else if (error.message.includes("Email not confirmed")) {
        errorMessage = "Please check your email and confirm your account";
      } else if (error.message.includes("signup_disabled")) {
        errorMessage = "New registrations are currently disabled";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Authentication needed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive"
      });
      return;
    }

    const emailValidation = validateEmail(forgotPasswordEmail);
    if (!emailValidation.isValid) {
      toast({
        title: "Invalid email",
        description: emailValidation.message || "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase.auth.signInWithOtp({
        email: forgotPasswordEmail.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) throw error;

      toast({
        title: "Magic link sent!",
        description: "Check your email and click the link to sign in without a password.",
      });

      setForgotPasswordEmail('');
      setShowForgotPassword(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send magic link",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-theme-purple-light/20 to-theme-purple/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-theme-purple to-theme-purple-light bg-clip-text text-transparent">
              Forgot Password
            </CardTitle>
            <CardDescription>
              Enter your email and we'll send you a magic link to sign in
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="Enter your email"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button 
              onClick={handleForgotPassword} 
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Sending Magic Link...' : 'Send Magic Link'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowForgotPassword(false)}
              className="w-full flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-theme-purple-light/20 to-theme-purple/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-theme-purple to-theme-purple-light bg-clip-text text-transparent">
            Task Reward Buddy
          </CardTitle>
          <CardDescription>
            Sign in to save your progress and access it from anywhere
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError('');
                  }}
                  disabled={loading}
                  className={emailError ? "border-destructive" : ""}
                />
                {emailError && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {emailError}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <div className="relative">
                  <Input
                    id="signin-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordError('');
                    }}
                    disabled={loading}
                    className={passwordError ? "border-destructive" : ""}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {passwordError && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {passwordError}
                  </div>
                )}
              </div>
              <Button 
                onClick={() => handleEmailAuth('signin')} 
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
              <Button
                variant="link"
                onClick={() => setShowForgotPassword(true)}
                className="w-full text-sm"
              >
                Forgot your password?
              </Button>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError('');
                  }}
                  disabled={loading}
                  className={emailError ? "border-destructive" : ""}
                />
                {emailError && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {emailError}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <div className="relative">
                  <Input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password (8+ chars, uppercase, lowercase, number, special char)"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordError('');
                    }}
                    disabled={loading}
                    className={passwordError ? "border-destructive" : ""}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {passwordError && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {passwordError}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              <Button 
                onClick={() => handleEmailAuth('signup')} 
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="text-sm text-muted-foreground"
            >
              Continue without account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
