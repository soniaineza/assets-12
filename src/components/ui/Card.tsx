import React from 'react';
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}
export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div
      className={`bg-paper-light border border-rule ${className}`}
      {...props}>
      
      {children}
    </div>);

}
export function CardHeader({ children, className = '', ...props }: CardProps) {
  return (
    <div
      className={`px-6 py-4 border-b border-rule bg-paper-dark/40 ${className}`}
      {...props}>
      
      {children}
    </div>);

}
export function CardTitle({ children, className = '', ...props }: CardProps) {
  return (
    <h3 className={`font-serif text-xl text-ink ${className}`} {...props}>
      {children}
    </h3>);

}
export function CardContent({ children, className = '', ...props }: CardProps) {
  return (
    <div className={`p-6 ${className}`} {...props}>
      {children}
    </div>);

}