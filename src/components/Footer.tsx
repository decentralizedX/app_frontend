import { FaXTwitter, FaLinkedinIn, FaGithub, FaTelegram } from 'react-icons/fa6';
import { SiGitbook } from 'react-icons/si';
import { useTheme } from "@/context/ThemeContext";

const Footer = () => {
  const { theme } = useTheme();

  const socialLinks = [
    {
      icon: <SiGitbook className="h-4 w-4" />,
      text: "Docs",
      href: "https://decentralizedx.gitbook.io/dx",
      label: "Documentation"
    },
    {
      icon: <FaTelegram className="h-4 w-4" />,
      text: "Telegram",
      href: "https://t.me/decentralizedX0",
      label: "Telegram Community"
    },
    {
      icon: <FaGithub className="h-4 w-4" />,
      text: "GitHub",
      href: "https://github.com/0xAakibAlam",
      label: "GitHub Repository"
    },
    {
      icon: <FaXTwitter className="h-4 w-4" />,
      text: "Twitter",
      href: "https://x.com/0xAakibAlam",
      label: "X (Twitter) Profile"
    },
    {
      icon: <FaLinkedinIn className="h-4 w-4" />,
      text: "LinkedIn",
      href: "https://www.linkedin.com/in/0xaakibalam/",
      label: "LinkedIn Profile"
    },
  ];

  return (
    <footer 
      className="mt-auto border-t"
      style={{
        backgroundColor: theme === "light" ? "#F8F9FA" : "#1A1A1A",
        borderColor: theme === "light" ? "#E5E5E5" : "#404040"
      }}
    >
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Copyright */}
          {/* <div 
            className="text-sm"
            style={{ color: theme === "light" ? "#6B7280" : "#9CA3AF" }}
          >
            Copyright © 2025 dX. All rights reserved.
          </div> */}
          
          {/* Social Links */}
          <div className="flex items-center gap-6">
            {socialLinks.map((link, index) => (
              <a
                key={index}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
                style={{ color: theme === "light" ? "#6B7280" : "#9CA3AF" }}
                aria-label={link.label}
              >
                {link.icon}
                <span className="hidden sm:inline">{link.text}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
