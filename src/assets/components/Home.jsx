import { useEffect, useState } from "react";
import ItemsList from "./ItemsList";

const Home = () => {
  const [items, setItems] = useState([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:8000/items")
    .then((res) => {
      if (!res.ok) {        
        setError(true)
        throw new Error('Network Error')
      }
      return res.json();
    })
    .then(data=>{
      setItems(data)
      setLoading(false)
      // console.log(data)
    }).catch(err=>{
      console.log(err)
    })
  }, []);
  return (
    <div className="mx-100 my-12 ">
      <ItemsList items={items} error={error} loading={loading}/>
    </div>
  );
};

export default Home;
