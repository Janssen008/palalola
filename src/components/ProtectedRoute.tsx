import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'user' | 'department_head' | 'oic';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!profile) {
    // Profile doesn't exist - sign out and redirect to logins
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <p className="text-sm text-muted-foreground">
            Your profile could not be found. Please try signing up again or contact an administrator.
          </p>
          <button
            onClick={() => {
              import('@/lib/supabase').then(({ supabase }) => {
                supabase.auth.signOut().then(() => {
                  window.location.href = '/login';
                });
              });
            }}
            className="text-sm text-primary underline hover:no-underline"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  // Check role requirement
  let roleMatches = false;
  if (!requiredRole) {
    roleMatches = true;
  } else if (requiredRole === 'department_head' && (profile.role === 'department_head' || profile.role === 'oic')) {
    roleMatches = true;
  } else if (profile.role === requiredRole) {
    roleMatches = true;
  }

  if (!roleMatches) {
    // Redirect to the correct panel
    if (profile.role === 'admin') {
      return <Navigate to="/admin" replace />;
    }
    if (profile.role === 'department_head' || profile.role === 'oic') {
      return <Navigate to="/dept-head" replace />;
    }
    return <Navigate to="/user" replace />;
  }

  return <>{children}</>;
}
