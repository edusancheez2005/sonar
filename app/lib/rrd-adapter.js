// Minimal adapter to avoid crashes where CRA pages import react-router-dom
export const Link = ({ href = '#', children, ...props }) => (
  <a href={href} {...props}>{children}</a>
);
export const useNavigate = () => (to) => {
  if (typeof window !== 'undefined') window.location.href = to;
};
export const useLocation = () => ({ pathname: typeof window !== 'undefined' ? window.location.pathname : '/' });
export const BrowserRouter = ({ children }) => children;
export const Routes = ({ children }) => children;
export const Route = ({ element }) => element;
export const Navigate = ({ to }) => {
  if (typeof window !== 'undefined') window.location.href = to;
  return null;
};
