import { component$ } from "@builder.io/qwik";
import { Image } from "@unpic/qwik";

const coverImage = "https://images.unsplash.com/photo-1590767950092-42b8362368da?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=3087&q=80";

export default component$(() => {
  return (
    <section class={`bg-gradient-to-b md:bg-gradient-to-r from-white via-purple-50 to-sky-100 dark:bg-none mt-[-72px]`}>
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:flex lg:h-screen 2xl:h-auto pt-[72px]">
        <div class="py-12 md:py-20 2xl:min-h-0 lg:flex lg:gap-8 lg:items-center lg:py-16">
          <div class="mx-auto text-center basis-1/2 lg:text-left md:pb-16 pb-12 lg:pb-0">
            <div>
              <h1 class="text-center text-4xl font-bold tracking-tight text-white sm:text-6xl sm:tracking-tight lg:text-[4rem] xl:text-[6rem] xl:tracking-tight 2xl:text-[6.5rem]">Plan,
                <span class="text-[hsl(200,100%,60%)]">{" "}Create,</span>
                <span class="whitespace-nowrap text-[hsl(240,100%,70%)]">{" "}Share</span>
                <span class="text-[hsl(280,100%,60%)] ">{" "}Vutabase</span>
              </h1>
              <div class="max-w-3xl mx-auto">
                <p class="text-xl text-gray-600 mb-8 dark:text-slate-400">
                  <span class="font-semibold underline decoration-wavy decoration-1 decoration-secondary-600 underline-offset-2">
                    Vutabase
                  </span>{" "}
                  is a production ready <b>research-first</b> framework. We've built it to be flexible and extensible, so you can focus on your content.
                </p>
                <p class="text-xl text-gray-600 mb-8 dark:text-slate-400">
                  Vutabase gives you the freedom to write, cite, and collaborate in the
                  way that works best for you. We don't force you to use a specific
                  citation style, or a specific way of organizing your content.
                </p>
                <div class="flex flex-col flex-nowrap gap-4 m-auto max-w-xs sm:flex-row sm:justify-center sm:max-w-md lg:justify-start lg:m-0 lg:max-w-7xl">
                  <div class="flex w-full sm:w-auto">
                    <a
                      class="btn btn-primary sm:mb-0 w-full"
                      href="https://github.com/chrisbirster/vutabase"
                      target="_blank"
                      rel="noopener"
                    >
                      Try it out
                    </a>
                  </div>
                  <div class="flex w-full sm:w-auto">
                    <button class="btn w-full bg-gray-50 dark:bg-transparent">Learn more</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="basis-1/2">
            <div class="relative m-auto max-w-5xl">
              <Image
                src={coverImage}
                layout="constrained"
                width={493}
                height={616}
                alt="Vutabase Hero Image (Cool dog)"
                class="mx-auto lg:mr-0 w-full drop-shadow-2xl rounded-md"
                breakpoints={[320, 480, 640, 1024]}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});
