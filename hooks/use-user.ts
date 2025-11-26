import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { authPromise } from '../constants/firebase';

export function useUser() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    authPromise.then(auth => {
      const unsubscribe = auth.onAuthStateChanged(currentUser => {
        setUser(currentUser);
      });
      return unsubscribe;
    });
  }, []);

  return { user };
}
