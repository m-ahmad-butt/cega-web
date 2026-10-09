import { Link } from 'react-router-dom';

/**
 * Brand mark only — logo image, no text.
 */
const BrandLogo = ({ to = '/', className = '', imgClassName = 'h-8 w-auto' }) => {
  const img = (
    <img
      src="/logo.png"
      alt=""
      className={`${imgClassName} object-contain`}
      draggable={false}
    />
  );

  if (!to) {
    return <span className={`inline-flex items-center ${className}`}>{img}</span>;
  }

  return (
    <Link to={to} className={`inline-flex items-center ${className}`} aria-label="Home">
      {img}
    </Link>
  );
};

export default BrandLogo;
