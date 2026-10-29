import Collections from "components/layout/search/collections";
import FilterList from "components/layout/search/filter";
import { estados, precios, sorting, traducirFiltros } from "lib/constants";
import { translate } from "@/lib/i18n/dict";
import { getLang } from "@/lib/i18n/lang";
import ChildrenWrapper from "./children-wrapper";
import { Suspense } from "react";

export default async function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = await getLang();

  return (
    <div className="page-container flex flex-col gap-8 bg-gradient-to-b from-brand-50/60 to-transparent pb-4 md:flex-row">
      <div className="order-first w-full flex-none md:max-w-[220px]">
        <Collections />
      </div>
      <div className="order-last min-h-screen w-full md:order-none">
        <Suspense fallback={null}>
          <ChildrenWrapper>{children}</ChildrenWrapper>
        </Suspense>
      </div>
      <div className="order-none flex-none md:order-last md:w-[220px]">
        <FilterList
          list={traducirFiltros(lang, sorting)}
          title={translate(lang, "search.sortTitle")}
        />

        <div className="mt-6">
          <FilterList
            list={traducirFiltros(lang, estados)}
            title={translate(lang, "search.statusTitle")}
          />
        </div>

        <div className="mt-6">
          <FilterList
            list={traducirFiltros(lang, precios)}
            title={translate(lang, "search.priceTitle")}
          />
        </div>
      </div>
    </div>
  );
}
