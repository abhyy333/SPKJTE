import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { AcademicTerm } from '../types';
import { getActiveAcademicTerm, academicTermsService } from '../services/academicTerms.service';

interface AcademicTermContextType {
  activeTerm: AcademicTerm | null;
  terms: AcademicTerm[];
  activeTermLoading: boolean;
  activeTermError: string | null;
  refetchActiveTerm: () => Promise<void>;
  refetchTerms: () => Promise<void>;
}

const AcademicTermContext = createContext<AcademicTermContextType | undefined>(undefined);

export const AcademicTermProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTerm, setActiveTerm] = useState<AcademicTerm | null>(null);
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [activeTermLoading, setActiveTermLoading] = useState<boolean>(true);
  const [activeTermError, setActiveTermError] = useState<string | null>(null);

  const fetchActiveTerm = useCallback(async () => {
    try {
      setActiveTermLoading(true);
      setActiveTermError(null);
      const term = await getActiveAcademicTerm();
      setActiveTerm(term);
    } catch (err: any) {
      console.error('get_active_academic_term failed', err);
      setActiveTermError('Gagal memuat periode akademik aktif.');
    } finally {
      setActiveTermLoading(false);
    }
  }, []);

  const fetchTerms = useCallback(async () => {
    try {
      const allTerms = await academicTermsService.getAcademicTerms();
      setTerms(allTerms);
    } catch (err) {
      console.warn('Failed to load academic terms list:', err);
    }
  }, []);

  // Initial independent load of academic term and terms list
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        setActiveTermLoading(true);
        setActiveTermError(null);
        const [term, allTerms] = await Promise.all([
          getActiveAcademicTerm().catch((err) => {
            console.error('get_active_academic_term failed', err);
            return null;
          }),
          academicTermsService.getAcademicTerms().catch((err) => {
            console.warn('getAcademicTerms failed', err);
            return [];
          }),
        ]);

        if (mounted) {
          if (term) {
            setActiveTerm(term);
          } else {
            // fallback to first active or first available term
            const fallback = allTerms.find((t) => t.is_active) || allTerms[0] || null;
            setActiveTerm(fallback);
          }
          setTerms(allTerms);
        }
      } catch (err: any) {
        if (mounted) {
          console.error('Academic term initialization error:', err);
          setActiveTermError('Gagal memuat periode akademik aktif.');
        }
      } finally {
        if (mounted) {
          setActiveTermLoading(false);
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      activeTerm,
      terms,
      activeTermLoading,
      activeTermError,
      refetchActiveTerm: fetchActiveTerm,
      refetchTerms: fetchTerms,
    }),
    [activeTerm, terms, activeTermLoading, activeTermError, fetchActiveTerm, fetchTerms]
  );

  return (
    <AcademicTermContext.Provider value={value}>
      {children}
    </AcademicTermContext.Provider>
  );
};

export function useAcademicTerm(): AcademicTermContextType {
  const context = useContext(AcademicTermContext);
  if (!context) {
    throw new Error('useAcademicTerm must be used within an AcademicTermProvider');
  }
  return context;
}
