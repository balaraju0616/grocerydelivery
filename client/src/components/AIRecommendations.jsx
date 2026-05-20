import { useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";
import ProductCard from "./ProductCard";

const SparkleIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-5 h-5"
  >
    <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
  </svg>
);

const AIRecommendations = ({ productId }) => {
  const { axios, currency, addToCart, removeFromCart, cartItems, navigate } =
    useAppContext();
  const [recommendations, setRecommendations] = useState([]);
  const [headline, setHeadline] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!productId) return;

    const fetchRecommendations = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await axios.get(`/api/ai/recommendations/${productId}`);
        if (data.success) {
          setRecommendations(data.recommendations);
          setHeadline(data.headline);
        } else {
          setError(data.message);
        }
      } catch (err) {
        setError("Could not load AI recommendations.");
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [productId]);

  if (error) return null; // Fail silently — don't break the page

  return (
    <div className="mt-20">
      {/* Section Header */}
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-2 text-primary mb-1">
          <SparkleIcon />
          <span className="text-sm font-semibold uppercase tracking-widest">
            AI Powered
          </span>
        </div>
        <p className="text-3xl font-medium text-center">
          {loading ? "Finding Perfect Pairings…" : headline || "Recommended For You"}
        </p>
        <div className="w-20 h-0.5 bg-primary rounded-full mt-2" />
        <p className="text-gray-500 text-sm mt-2">
          Curated by AI based on this product
        </p>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-6 mt-8">
          {Array(4)
            .fill("")
            .map((_, i) => (
              <div
                key={i}
                className="border border-gray-200 rounded-md p-4 min-w-56 max-w-56 w-full animate-pulse"
              >
                <div className="bg-gray-200 h-36 rounded mb-3" />
                <div className="bg-gray-200 h-3 rounded w-3/4 mb-2" />
                <div className="bg-gray-200 h-3 rounded w-1/2 mb-4" />
                <div className="bg-gray-200 h-8 rounded" />
              </div>
            ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-6 mt-8">
          {recommendations.map((product, index) => (
            <div key={index} className="flex flex-col gap-2">
              <ProductCard product={product} />
              {/* AI Reason Badge */}
              <div className="flex items-start gap-1.5 px-1">
                <SparkleIcon />
                <p className="text-xs text-gray-500 leading-relaxed">
                  {product.reason}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AIRecommendations;
