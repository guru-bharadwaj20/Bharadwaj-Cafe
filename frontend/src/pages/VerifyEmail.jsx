import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../utils/api';
import { IMG } from '../assets/cloudinary';
import { spinner } from '../styles/feedback';
import {
  authPage,
  authContainer,
  authRightCentered,
  authFormContainer,
  authHeader,
  authLogo,
  authTitle,
  authBtnInline,
  authBtnOutline,
} from '../styles/auth';

/*
 * Every class this page used besides `.auth-*` and `.spinner` --
 * `.verification-status`, `.loading-spinner`, `.success-box`, `.error-box`,
 * `.redirect-info`, `.action-buttons` -- was declared in no stylesheet in the
 * project. The page rendered as a column of unstyled text with a raw
 * FontAwesome glyph above it. Migrating auth.css meant either carrying that
 * over or finishing it; these are written in the same vocabulary as the other
 * four auth pages. See docs/tailwind-migration.md.
 */
const statusBox = 'flex flex-col items-center gap-3 rounded-s px-5 py-8 text-center';
const statusIcon = 'text-[3.5rem]';
const statusTitle = 'text-l font-bold';
const statusText = 'text-n text-[#666]';

const VerifyEmail = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState({ type: 'loading', message: 'Verifying your email...' });

  useEffect(() => {
    verifyEmail();
  }, [token]);

  const verifyEmail = async () => {
    try {
      const response = await api.verifyEmail(token);
      setStatus({
        type: 'success',
        message: response.message || 'Email verified successfully!',
      });

      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Verification failed. Link may be invalid or expired.',
      });
    }
  };

  return (
    <div className={authPage} id="main-content">
      <div className={authContainer}>
        <div className={authRightCentered}>
          <div className={authFormContainer}>
            <div className={authHeader}>
              <img src={IMG.logo} alt="Bharadwaj's Cafe" className={authLogo} />
              <h1 className={authTitle}>Email Verification</h1>
            </div>

            <div className="mt-[25px]">
              {status.type === 'loading' && (
                <div className={statusBox}>
                  <div className={spinner}></div>
                  <p className={statusText}>{status.message}</p>
                </div>
              )}

              {status.type === 'success' && (
                <div className={`${statusBox} bg-[#efe]`}>
                  <i className={`fa-solid fa-circle-check ${statusIcon} text-[#3c3]`}></i>
                  <h2 className={`${statusTitle} text-[#2a7a2a]`}>Success!</h2>
                  <p className={statusText}>{status.message}</p>
                  <p className="text-s text-[#999]">Redirecting to login page...</p>
                </div>
              )}

              {status.type === 'error' && (
                <div className={`${statusBox} bg-[#fee]`}>
                  <i className={`fa-solid fa-circle-exclamation ${statusIcon} text-[#c33]`}></i>
                  <h2 className={`${statusTitle} text-[#c33]`}>Verification Failed</h2>
                  <p className={statusText}>{status.message}</p>
                  <div className="mt-2 flex flex-wrap justify-center gap-3">
                    <Link to="/register" className={authBtnInline}>
                      Register Again
                    </Link>
                    <Link to="/login" className={authBtnOutline}>
                      Go to Login
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
