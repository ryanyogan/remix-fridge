interface FormFieldProps {
  label?: string;
  htmlFor?: string;
  type?: string;
  value: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function FormField({
  label,
  htmlFor,
  type = "text",
  value,
  onChange,
}: FormFieldProps) {
  return (
    <>
      <label className="text-blue-600 font-semibold" htmlFor={htmlFor}>
        {label}
      </label>
      <input
        id={htmlFor}
        type={type}
        name={htmlFor}
        value={value}
        className="w-full p-2 rounded-xl my-2"
        onChange={onChange}
      />
    </>
  );
}
