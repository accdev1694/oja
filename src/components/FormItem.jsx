import InputField from "./InputField";

const FormItem = ({ className, placeholder}) => {
  return (
    <form className={`${className} py-2 bg-light text-md`} action="">
      <InputField placeholder={placeholder}/>
    </form>
  );
};

export default FormItem;
