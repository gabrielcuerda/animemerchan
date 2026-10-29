"use client";

import clsx from "clsx";
import type { ParamFilterItem, SortFilterItem } from "lib/constants";
import { createUrl } from "lib/utils";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ListItem, PathFilterItem } from ".";

function PathFilterItem({ item }: { item: PathFilterItem }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = pathname === item.path;
  const newParams = new URLSearchParams(searchParams.toString());
  const DynamicTag = active ? "p" : Link;

  newParams.delete("q");

  return (
    <li className="mt-2 flex text-black dark:text-white" key={item.title}>
      <DynamicTag
        href={createUrl(item.path, newParams)}
        className={clsx(
          "w-full text-sm underline-offset-4 hover:underline dark:hover:text-neutral-100",
          {
            "underline underline-offset-4": active,
          },
        )}
      >
        {item.title}
      </DynamicTag>
    </li>
  );
}

function SortFilterItem({ item }: { item: SortFilterItem }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get("sort") === item.slug;
  const q = searchParams.get("q");
  const href = createUrl(
    pathname,
    new URLSearchParams({
      ...(q && { q }),
      ...(item.slug && item.slug.length && { sort: item.slug }),
    }),
  );
  const DynamicTag = active ? "p" : Link;

  return (
    <li
      className="mt-2 flex text-sm text-black dark:text-white"
      key={item.title}
    >
      <DynamicTag
        prefetch={!active ? false : undefined}
        href={href}
        className={clsx("w-full hover:underline hover:underline-offset-4", {
          "underline underline-offset-4": active,
        })}
      >
        {item.title}
      </DynamicTag>
    </li>
  );
}

function ParamFilterItem({ item }: { item: ParamFilterItem }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get(item.param) === item.value;
  const newParams = new URLSearchParams(searchParams.toString());

  if (active) newParams.delete(item.param);
  else newParams.set(item.param, item.value);

  const href = createUrl(pathname, newParams);

  return (
    <li
      className="mt-2 flex text-sm text-black dark:text-white"
      key={item.title}
    >
      <Link
        href={href}
        prefetch={false}
        className={clsx("w-full hover:underline hover:underline-offset-4", {
          "underline underline-offset-4": active,
        })}
      >
        {item.title}
      </Link>
    </li>
  );
}

export function FilterItem({ item }: { item: ListItem }) {
  if ("path" in item) return <PathFilterItem item={item} />;
  if ("param" in item) return <ParamFilterItem item={item} />;
  return <SortFilterItem item={item} />;
}
