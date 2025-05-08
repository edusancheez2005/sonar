import { createGlobalStyle } from 'styled-components';

const GlobalStyles = createGlobalStyle`
  :root {
    --background-dark: #0a1621;
    --background-card: #0d2134;
    --primary: #36a6ba;
    --secondary: #1e3951;
    --text-primary: #ffffff;
    --text-secondary: #a0b2c6;
    --buy-color: #36a6ba;
    --sell-color: #e74c3c;
    --chart-blue: #36a6ba;
    --chart-dark-blue: #1e3951;
    --chart-green: #2ecc71;
    --chart-purple: #9b59b6;
  }

  html {
    scroll-behavior: smooth;
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Roboto', 'Arial', sans-serif;
    background-color: var(--background-dark);
    color: var(--text-primary);
    line-height: 1.5;
  }

  h1, h2, h3, h4, h5, h6 {
    font-weight: 500;
    margin-bottom: 1rem;
  }

  a {
    text-decoration: none;
    color: var(--primary);
    transition: color 0.3s ease;
    
    &:hover {
      color: var(--text-primary);
    }
  }

  button {
    cursor: pointer;
    border: none;
    background: none;
    font-family: inherit;
  }

  .container {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1rem;
  }

  .card {
    background-color: var(--background-card);
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .buy {
    color: var(--buy-color);
    background-color: rgba(54, 166, 186, 0.15);
    border-radius: 4px;
    padding: 0.25rem 0.75rem;
    font-weight: 500;
  }

  .sell {
    color: var(--sell-color);
    background-color: rgba(231, 76, 60, 0.15);
    border-radius: 4px;
    padding: 0.25rem 0.75rem;
    font-weight: 500;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0;
    
    th, td {
      padding: 0.75rem 1rem;
      text-align: left;
      border-bottom: 1px solid var(--secondary);
    }
    
    th {
      color: var(--text-secondary);
      font-weight: 500;
    }
    
    tr:last-child td {
      border-bottom: none;
    }
  }

  /* Animation classes */
  .fade-in {
    opacity: 0;
    animation: fadeIn 0.5s forwards;
  }

  .slide-in {
    transform: translateY(20px);
    opacity: 0;
    animation: slideIn 0.5s forwards;
  }

  @keyframes fadeIn {
    to {
      opacity: 1;
    }
  }

  @keyframes slideIn {
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

export default GlobalStyles; 