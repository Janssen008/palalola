import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const isValidEmail = (emailStr: string): boolean => {
  const email = emailStr.trim().toLowerCase();
  if (!email || !email.includes('@')) return false;
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  const domain = parts[1];
  const exactDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'gov.com'];
  return exactDomains.includes(domain) || domain.endsWith('.gov.ph');
};

interface ProfileSettingsModalProps {
  children: React.ReactNode;
}

export function ProfileSettingsModal({ children }: ProfileSettingsModalProps) {
  const { profile, user, refreshProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [positionTitle, setPositionTitle] = useState(profile?.position_title || '');
  const [email, setEmail] = useState(user?.email || '');
  const [otp, setOtp] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setFullName(profile?.full_name || '');
      setPositionTitle(profile?.position_title || '');
      
      const pendingEmailChange = user?.new_email;
      if (pendingEmailChange) {
        setEmail(pendingEmailChange);
        setPendingEmail(pendingEmailChange);
        setShowOtpInput(true);
      } else {
        setEmail(user?.email || '');
        setPendingEmail('');
        setShowOtpInput(false);
      }
      setOtp('');
    }
  };

  const handleUpdateName = async () => {
    if (!profile?.id) return;
    if (!fullName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    setIsUpdatingName(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() })
        .eq('id', profile.id);

      if (error) throw error;
      await refreshProfile();
      toast.success('Name updated successfully.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update name';
      toast.error(errorMessage);
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!profile?.id) return;
    setIsUpdatingRole(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ position_title: positionTitle.trim() || null })
        .eq('id', profile.id);

      if (error) throw error;
      await refreshProfile();
      toast.success('Role updated successfully.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update role';
      toast.error(errorMessage);
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!user?.email) return;
    if (email === user.email) {
      toast.info('Email is already up to date');
      return;
    }
    if (!isValidEmail(email)) {
      toast.error('Only @gmail.com, @yahoo.com, @outlook.com, @hotmail.com, @gov.com, and .gov.ph email addresses are allowed.');
      return;
    }

    setIsUpdatingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: email.trim() });
      if (error) throw error;
      
      setPendingEmail(email.trim());
      setShowOtpInput(true);
      toast.success('Confirmation code sent to new email address.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update email';
      if (
        errorMessage.toLowerCase().includes("already registered") ||
        errorMessage.toLowerCase().includes("already exists") ||
        errorMessage.toLowerCase().includes("already in use")
      ) {
        toast.error("This email address is already in use.");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      toast.error('Please enter the confirmation code');
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: pendingEmail,
        token: otp.trim(),
        type: 'email_change',
      });

      if (error) throw error;
      toast.success('Email updated successfully!');
      setShowOtpInput(false);
      setOpen(false); // Close the modal on success
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid confirmation code';
      toast.error(errorMessage);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Profile Settings</DialogTitle>
          <DialogDescription>
            Update your account details here.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Full Name Update */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Full Name</Label>
            <div className="flex gap-2">
              <Input
                id="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="First Last"
              />
              <Button 
                onClick={handleUpdateName} 
                disabled={isUpdatingName || fullName === profile?.full_name}
              >
                {isUpdatingName ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>

          {/* Role / Position Title Update */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="role">Role / Position Title</Label>
            <div className="flex gap-2">
              <Input
                id="role"
                value={positionTitle}
                onChange={(e) => setPositionTitle(e.target.value)}
                placeholder="e.g. IT Officer II, Administrative Aide"
              />
              <Button
                onClick={handleUpdateRole}
                disabled={isUpdatingRole || positionTitle === (profile?.position_title || '')}
              >
                {isUpdatingRole ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>

          {/* Email Update */}
          <div className="flex flex-col gap-2 mt-4">
            <Label htmlFor="email">Email Address</Label>
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                disabled={showOtpInput}
              />
              <Button 
                onClick={handleUpdateEmail} 
                disabled={isUpdatingEmail || showOtpInput || email === user?.email}
              >
                {isUpdatingEmail ? 'Sending...' : 'Update'}
              </Button>
            </div>
            {showOtpInput && (
              <p className="text-[12px] text-muted-foreground mt-1">
                A confirmation code has been sent to {pendingEmail}.{' '}
                <button
                  type="button"
                  onClick={() => {
                    setShowOtpInput(false);
                    setOtp('');
                    setEmail(user?.email || '');
                  }}
                  className="text-primary hover:underline font-medium focus:outline-none cursor-pointer"
                >
                  Change email
                </button>
              </p>
            )}
          </div>

          {/* OTP Verification */}
          {showOtpInput && (
            <div className="flex flex-col gap-2 mt-2 animate-in fade-in slide-in-from-top-2">
              <Label htmlFor="otp" className="text-primary">Confirmation Code</Label>
              <div className="flex gap-2">
                <Input
                  id="otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit code"
                />
                <Button 
                  onClick={handleVerifyOtp} 
                  disabled={isVerifyingOtp}
                  variant="default"
                >
                  {isVerifyingOtp ? 'Verifying...' : 'Verify Code'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
