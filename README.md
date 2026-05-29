# Chad de Guzman - Personal Portfolio

A modern, responsive portfolio website showcasing my work, skills, and experience.

## 🎨 Features

- **Responsive Design**: Fully responsive layout that works seamlessly on desktop, tablet, and mobile devices
- **Dark/Light Mode Toggle**: Theme switcher for user preference with smooth transitions
- **Smooth Animations**: Elegant fade-up animations and reveal effects for a polished user experience
- **Modern Typography**: Clean typography hierarchy using Playfair Display (headings) and DM Sans (body)
- **Accessibility**: Semantic HTML and keyboard-friendly navigation
- **Performance Optimized**: Lightweight CSS with smooth transitions and efficient animations

## 📋 Sections

### Navigation
Fixed navigation bar with smooth scrolling and active state indicators. Includes theme toggle for dark/light mode switching.

### Hero Section
Eye-catching hero with animated tagline, title with accent highlights, subtitle, and call-to-action buttons.

### About Section
Grid layout with profile image placeholder, biographical information, and key statistics.

### Skills Section
Categorized skill cards with icons, descriptions, and technology tags. Interactive hover effects with gradient accents.

### Projects
Curated list of portfolio projects with:
- Project numbers and years
- Descriptions
- Technology stacks (tags)
- Interactive hover states

### Experience / Timeline
Chronological timeline of professional experience with:
- Timeline markers and connecting line
- Period and location information
- Role titles
- Company details

### Just for Fun Section
Teaser section showcasing additional creative projects and interests with preview cards.

### Contact Section
Centered contact area with email link and social media links (GitHub, LinkedIn, etc.).

## 🛠️ Technical Stack

- **HTML5**: Semantic structure
- **CSS3**: Custom properties (variables), Grid, Flexbox, Animations
- **JavaScript**: Theme toggle, scroll behavior, intersection observer for animations
- **Fonts**: Google Fonts (Playfair Display, DM Sans)

## 🎯 CSS Architecture

### Color System
The design uses CSS custom properties for easy theme switching:

```css
/* Dark Mode (Default) */
--ink: #e8ede8           /* Primary text */
--accent: #a8d4a8        /* Accent color (green) */
--surface: #0d110d       /* Background */

/* Light Mode */
--ink: #1a2e1a
--surface: #F2F0EF
--accent: #3a7a3a
```

### Layout
- **Max Width**: 1100px for optimal content readability
- **Grid System**: Responsive grid layouts for skills and projects
- **Typography**: Flexible sizing with `clamp()` for responsive text

## 📱 Responsive Breakpoints

- **Desktop**: Full layout (>868px)
- **Tablet/Mobile**: Adjusted grid columns and spacing (<868px)

## 🚀 Usage

1. Clone the repository
2. Open `index.html` in your browser
3. Customize content in HTML sections
4. Modify colors and styles in `style.css` using the CSS variables

## 🎨 Customization

### Change Theme Colors
Update the CSS variables in `:root` section of `style.css`:

```css
:root {
  --accent: #your-color;
  --ink: #your-text-color;
  --surface: #your-background;
}
```

### Add New Sections
Follow the existing section pattern with `.section` wrapper and appropriate content structure.

### Update Skills/Projects
Add new skill cards or project items following the existing markup pattern in `index.html`.

## ✨ Key Design Details

- **Gradient Accents**: Subtle gradient lines on hover for visual feedback
- **Blur Effects**: Backdrop blur on navigation for modern depth
- **Color Transitions**: Smooth color transitions on theme switch (0.4s)
- **Scroll Behavior**: Smooth scroll navigation throughout the site
- **Animation Library**: Reusable `fadeUp` and `reveal` animations

## 📄 File Structure

```
chaddeguzman.github.io/
├── index.html          # Main portfolio HTML
├── style.css           # All styling and animations
├── script.js           # Interactive functionality
└── README.md           # This file
```

## 🔗 Links

- **Live Portfolio**: [chaddeguzman.github.io](https://chaddeguzman.github.io)
- **Email**: [chadsama.27@gmail.com](mailto:chadsama.27@gmail.com)
- **GitHub**: [/chaddeguzman](https://github.com/chaddeguzman)
- **LinkedIn**: [chad-de-guzman](https://www.linkedin.com/in/chad-de-guzman/)

## 🙏 Credits

- **Fonts**: [Google Fonts](https://fonts.google.com) - Playfair Display, DM Sans
- **Icons**: [Your Icon Library]
- **Design Inspiration**: Modern minimalist portfolio design trends

---

**Last Updated**: May 2026

Feel free to fork this repository and customize it for your own
