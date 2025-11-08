"use client";
import type { ButtonHTMLAttributes } from "react";

export default function PrimaryButton(
  props: ButtonHTMLAttributes<HTMLButtonElement>
) {
  const { className = "", ...rest } = props;
  return (
    <button
      {...rest}
      className={`rounded-xl px-4 py-2 font-medium disabled:opacity-50 btn-brand ${className}`}
    />
  );
}